import * as vscode from 'vscode';
import { execSync, exec } from 'child_process';
import { WallTime } from './time';
import { getParentDirectory } from './fileutilities';
import { returnIfNoThrow } from './util';

/**
 * Represents a job in the scheduler.
 */
export class Job {
    /**
     * Creates a new instance of the Job class.
     * @param id The ID of the job.
     * @param name The name of the job.
     * @param status The status of the job.
     * @param queue The queue in which the job is scheduled.
     * @param batchFile The path to the batch file associated with the job.
     * @param outputFile The path to the output file generated by the job.
     * @param maxTime The maximum time allowed for the job to run.
     * @param curTime The current time of the job.
     */
    constructor(
        public id: string,
        public name: string,
        public status: string,
        public queue?: string,
        public batchFile?: string,
        public outputFile?: string,
        public maxTime?: WallTime,
        public curTime?: WallTime
    ) {}

    /**
     * Gets the time left for the job to complete.
     * @returns The time left for the job to complete, or undefined if the maximum time or current time is not defined.
     */
    public getTimeLeft(): WallTime | undefined {
        if (this.maxTime && this.curTime) {
            return new WallTime(0, 0, 0, this.maxTime.absDiffSeconds(this.curTime));
        } else {
            return undefined;
        }
    }

    /**
     * Checks if the job is a certain percentage finished.
     * @param percent The percentage to check.
     * @returns True if the job is at least the specified percentage finished, false if it is not, or undefined if the maximum time or current time is not defined.
     */
    public isPercentFinished(percent: number): boolean | undefined {
        if (this.maxTime && this.curTime) {
            return this.curTime.toSeconds() / this.maxTime.toSeconds() >= percent;
        } else {
            return undefined;
        }
    }
}

/**
 * Sorts an array of jobs based on the specified key.
 *
 * @param jobs - The array of jobs to be sorted.
 * @param key - The key to sort the jobs by. Valid keys are "id", "name", "time left", and "status".
 * @returns void
 */
export function sortJobs(jobs: Job[], key: string | null | undefined): void {
    if (!key) {
        return;
    }

    const AVAILABLE_KEYS = ['id', 'name', 'time left', 'status'];
    if (!AVAILABLE_KEYS.includes(key)) {
        vscode.window.showErrorMessage(`Invalid sort key: ${key}`);
        return;
    }

    jobs.sort((a, b) => {
        if (key === 'id') {
            return a.id.localeCompare(b.id);
        } else if (key === 'name') {
            return a.name.localeCompare(b.name);
        } else if (key === 'time left') {
            let aTimeLeft = a.getTimeLeft();
            let bTimeLeft = b.getTimeLeft();
            if (aTimeLeft && bTimeLeft) {
                return aTimeLeft.cmp(bTimeLeft);
            } else {
                /* c8 ignore next 2 */
                return 0;
            }
        } else if (key === 'status') {
            return a.status.localeCompare(b.status);
        } else {
            /* c8 ignore next 2 */
            return 0;
        }
    });
}

/**
 * Represents a scheduler that manages jobs in a queue.
 */
export interface Scheduler {
    /**
     * Retrieves the list of jobs in the queue.
     * @returns A promise that resolves to an array of Job objects.
     */
    getQueue(): Thenable<Job[]>;

    /**
     * Cancels a specific job.
     * @param job - The job to cancel.
     */
    cancelJob(job: Job): void;

    /**
     * Submits a job to the scheduler.
     * @param jobScript - The job script to submit, either as a string or a URI.
     */
    submitJob(jobScript: string | vscode.Uri): void;

    /**
     * Retrieve the output path for a job file. Is permitted to simply return
     * job.outputFile. Returns undefined if the job does not have an output file.
     * @param job The job for which to retrieve the output path.
     * @returns The output path for the job or undefined if the job does not have an output file.
     */
    getJobOutputPath(job: Job): string | undefined;
}

/**
 * Represents a column available from the scheduler. A utility class used by SlurmScheduler
 * to format the input to the squeue command.
 */
export class SchedulerDataColumn {
    /**
     * Creates a new instance of SchedulerDataColumn.
     * @param name The name of the column.
     * @param chars The number of characters in the column (optional).
     */
    constructor(
        public name: string,
        public chars: number | undefined
    ) {
        if (chars !== undefined) {
            if (!Number.isInteger(chars)) {
                throw new Error(`chars must be an integer: ${chars}`);
            } else if (+chars <= 0) {
                throw new Error(`chars must be positive: ${chars}`);
            }
        }
    }

    /**
     * Returns a string representation of the column.
     * @returns The string representation of the column.
     */
    public toString(): string {
        if (this.chars) {
            return `${this.name}:${this.chars}`;
        } else {
            return this.name;
        }
    }
}

/**
 * Represents a Slurm scheduler. Provides interfaces for querying the queue and submitting and cancelling jobs.
 */
export class SlurmScheduler implements Scheduler {
    /**
     * The columns of the scheduler data we are querying squeue for.
     */
    private readonly columns: SchedulerDataColumn[] = [
        new SchedulerDataColumn('JobID', 255),
        new SchedulerDataColumn('Name', 255),
        new SchedulerDataColumn('State', 255),
        new SchedulerDataColumn('Partition', 255),
        new SchedulerDataColumn('QOS', 255),
        new SchedulerDataColumn('STDOUT', 255),
        new SchedulerDataColumn('TimeLimit', 255),
        new SchedulerDataColumn('TimeUsed', 255),
        new SchedulerDataColumn('Command', 255), // command last since it can sometimes have spaces in it
    ];

    /**
     * Retrieves the queue of jobs using squeue.
     * @returns A promise that resolves to an array of jobs.
     */
    public getQueue(): Thenable<Job[]> {
        const output = this.getQueueOutput();
        return output.then(
            o => {
                if (o) {
                    return this.parseQueueOutput(o);
                } else {
                    return [];
                }
            },
            error => {
                vscode.window.showErrorMessage(`Failed to get queue.\nError: ${error}`);
                return [];
            }
        );
    }

    /**
     * Cancels a job using scancel.
     * @param job - The job to cancel.
     */
    public cancelJob(job: Job): void {
        try {
            execSync(`scancel ${job.id}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to cancel job ${job.id}.\nError: ${error}`);
        }
    }

    /**
     * Submits a job using sbatch.
     * If slurm-dashboard.setJobWorkingDirectoryToScriptDirectory is true, then the job's working directory will be set
     * to the directory containing the job script.
     * @param jobScript - The job script to submit.
     * @warning This function is likely to silently fail if slurm-dashboard.setJobWorkingDirectoryToScriptDirectory is
     *          set to false. VSCode runs the extension in /tmp by default and most Slurm configurations do not allow
     *          jobs to be submitted from /tmp.
     */
    public submitJob(jobScript: string | vscode.Uri): void {
        try {
            const setCWD = vscode.workspace
                .getConfiguration('slurm-dashboard')
                .get('setJobWorkingDirectoryToScriptDirectory', true);

            let jobScriptPath: string;
            if (typeof jobScript === 'string') {
                jobScriptPath = jobScript;
            } else {
                jobScriptPath = jobScript.fsPath;
            }

            let execOptions: any = {};
            if (setCWD) {
                const cwd = getParentDirectory(jobScriptPath);
                execOptions['cwd'] = cwd;
            }

            execSync(`sbatch ${jobScriptPath}`, execOptions);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to submit job ${jobScript}.\nError: ${error}`);
        }
    }

    /**
     * Retrieves the output of the queue command.
     * @returns A promise that resolves to the output string or undefined if there was an error.
     */
    private getQueueOutput(): Thenable<string | undefined> {
        const columnsString = this.columns.join(',');
        const command = `squeue --me --noheader -O ${columnsString}`;

        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else if (stderr) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Parses the output of the queue command into an array of jobs.
     * @param output - The output string to parse.
     * @returns An array of jobs.
     */
    private parseQueueOutput(output: string): Job[] {
        let jobs: Job[] = [];

        /* iterate thru each line of output */
        output.split('\n').forEach(line => {
            if (line === undefined || line === '') {
                return;
            }

            /* split line into columns by whitespace */
            let columns = line.split(/\s+/);

            /* parse columns into job */
            let results: { [key: string]: string } = {};
            const zip = (a: any, b: any) => a.map((k: any, i: any) => [k, b[i]]);
            for (let [col, val] of zip(this.columns, columns)) {
                results[col.name] = val;
            }

            const timeLimit = returnIfNoThrow(() => WallTime.fromString(results['TimeLimit']));
            const timeUsed = returnIfNoThrow(() => WallTime.fromString(results['TimeUsed']));

            /* create job */
            let job = new Job(
                results['JobID'],
                results['Name'],
                results['State'],
                results['Partition'],
                results['Command'],
                undefined /* let this be filled in by getJobOutputPath later */,
                timeLimit,
                timeUsed
            );
            jobs.push(job);
        });

        return jobs;
    }

    /**
     * Finds the path for the standard output file of a job.
     * Returns job.outputFile if it is already defined.
     * Otherwise uses scontrol to find the output file.
     *
     * @param job The job for which to resolve the stdout path.
     * @returns The resolved stdout path or undefined if the job does not have an output file.
     */
    public getJobOutputPath(job: Job): string | undefined {
        /* early exit if it's already defined */
        if (job.outputFile) {
            return job.outputFile;
        }

        const command = `scontrol show job ${job.id}`;

        try {
            const output = execSync(command).toString().trim();

            /* find line that starts with StdOut */
            const lines = output.split('\n');
            let stdoutLine: string | undefined = undefined;
            for (let line of lines) {
                if (line.trim().startsWith('StdOut=')) {
                    stdoutLine = line.trim();
                    break;
                }
            }

            /* if we didn't find a line, return undefined */
            if (!stdoutLine) {
                throw new Error(`Failed to find stdout line in output: ${output}`);
            }

            /* extract path from line: StdOut=/path/to/file */
            const parts = stdoutLine.split('=');
            if (parts.length < 2) {
                throw new Error(`Failed to parse stdout line: ${stdoutLine}`);
            }
            const fpath = parts[1].trim();

            job.outputFile = fpath;
            return fpath;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get job output path for job ${job.id}.\nError: ${error}`);
            return undefined;
        }
    }
}

export class Debug implements Scheduler {
    /**
     * The list of jobs in the debug scheduler.
     */
    // prettier-ignore
    private jobs: Job[] = [
        new Job("1", "job1", "RUNNING", "debug", "job1.sh", "job1.out", new WallTime(0, 0, 30, 0), new WallTime(0, 0, 12, 43)),
        new Job("2", "job2", "RUNNING", "debug", "job2.sh", "job2.out", new WallTime(0, 1, 30, 0), new WallTime(0, 1, 28, 1)),
        new Job("3", "job3", "RUNNING", "debug", "job3.sh", "job3.out", new WallTime(0, 0, 30, 0), new WallTime(0, 0, 1, 15)),
        new Job("4", "job4", "PENDING", "debug", "job4.sh", "job4.out", new WallTime(0, 1, 20, 40), new WallTime(0, 0, 0, 0)),
        new Job("5", "job5", "PENDING", "debug", "job5.sh", "job5.out", new WallTime(1, 12, 0, 0), new WallTime(0, 0, 0, 0)),
        new Job("6", "job6", "COMPLETED", "debug", "job6.sh", "job6.out", new WallTime(0, 7, 0, 0), new WallTime(0, 7, 0, 0)),
        new Job("7", "job7", "TIMEOUT", "debug", "job7.sh", "job7.out", new WallTime(0, 1, 30, 0), new WallTime(0, 1, 30, 0)),
        new Job("8", "job8", "CANCELLED", "debug", "job8.sh", "job8.out", new WallTime(0, 23, 59, 59), new WallTime(0, 0, 0, 0)),
        new Job("9", "job9", "FAILED", "debug", "job9.sh", "job9.out", new WallTime(0, 0, 5, 0), new WallTime(0, 0, 0, 0)),
    ];

    /**
     * Retrieves the queue of jobs. Just returns the list of debug jobs.
     * @returns A promise that resolves to an array of Job objects.
     */
    public getQueue(): Thenable<Job[]> {
        return Promise.resolve(this.jobs);
    }

    /**
     * Cancels a job. Removes job from debug list and shows an information message.
     * @param job - The job to cancel.
     */
    public cancelJob(job: Job): void {
        this.jobs = this.jobs.filter(j => j.id !== job.id);
        vscode.window.showInformationMessage(`Cancel job ${job.id}`);
    }

    /**
     * Submits a job for execution. Just shows an information message.
     * @param jobScript - The job script to submit.
     */
    public submitJob(jobScript: string | vscode.Uri): void {
        vscode.window.showInformationMessage(`Submit job ${jobScript}`);
    }

    /**
     * For the debug scheduler, just returns the job's output file.
     * @param job The job for which to retrieve the output path.
     * @returns The output path for the job or undefined if the job does not have an output file.
     */
    public getJobOutputPath(job: Job): string | undefined {
        return job.outputFile;
    }
}

/**
 * Retrieves the scheduler based on the configuration settings.
 * If the scheduler type is "slurm", it returns an instance of the SlurmScheduler class.
 * If the scheduler type is "debug", it returns an instance of the Debug class.
 * If the scheduler type is unknown, it shows an error message and returns an instance of the SlurmScheduler class as a fallback.
 * @returns The scheduler instance based on the configuration settings.
 */
export function getScheduler(): Scheduler {
    const schedulerType = vscode.workspace.getConfiguration('slurm-dashboard').get('backend', 'slurm');
    if (schedulerType === 'slurm') {
        return new SlurmScheduler();
    } else if (schedulerType === 'debug') {
        return new Debug();
    } else {
        vscode.window.showErrorMessage(`Unknown scheduler type: ${schedulerType}. Defaulting to slurm.`);
        return new SlurmScheduler();
    }
}
