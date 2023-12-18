import * as vscode from 'vscode';
import { execSync, exec } from 'child_process';
import { WallTime } from "./time";
import { getParentDirectory } from './fileutilities';

export class Job {
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

    public getTimeLeft(): WallTime|undefined {
        if (this.maxTime && this.curTime) {
            return new WallTime(0, 0, 0, this.maxTime.absDiffSeconds(this.curTime));
        } else {
            return undefined;
        }
    }

    public isPercentFinished(percent: number): boolean|undefined {
        if (this.maxTime && this.curTime) {
            return this.curTime.toSeconds() / this.maxTime.toSeconds() >= percent;
        } else {
            return undefined;
        }
    }
}

export function sortJobs(jobs: Job[], key: string|null|undefined) {
    if (!key) {
        return;
    }

    const AVAILABLE_KEYS = ["id", "name", "time left", "status"];
    if (!AVAILABLE_KEYS.includes(key)) {
        vscode.window.showErrorMessage(`Invalid sort key: ${key}`);
        return;
    }

    jobs.sort((a, b) => {
        if (key === "id") {
            return a.id.localeCompare(b.id);
        } else if (key === "name") {
            return a.name.localeCompare(b.name);
        } else if (key === "time left") {
            let aTimeLeft = a.getTimeLeft();
            let bTimeLeft = b.getTimeLeft();
            if (aTimeLeft && bTimeLeft) {
                return aTimeLeft.cmp(bTimeLeft);
            } else {
                return 0;
            }
        } else if (key === "status") {
            return a.status.localeCompare(b.status);
        } else {
            return 0;
        }
    });
}


export interface Scheduler {

    getQueue(): Thenable<Job[]>;

    cancelJob(job: Job): void;

    submitJob(jobScript: string|vscode.Uri): void;

}

class SchedulerDataColumn {
    constructor(public name: string, public chars: number|undefined) {}

    public toString(): string {
        if (this.chars) {
            return `${this.name}:${this.chars}`;
        } else {
            return this.name;
        }
    }
}

export class SlurmScheduler implements Scheduler {
    private readonly columns: SchedulerDataColumn[] = [
        new SchedulerDataColumn("JobID", 15),
        new SchedulerDataColumn("Name", 35),
        new SchedulerDataColumn("State", 25),
        new SchedulerDataColumn("Partition", 25),
        new SchedulerDataColumn("QOS", 25),
        new SchedulerDataColumn("STDOUT", 255),
        new SchedulerDataColumn("Command", 255),
        new SchedulerDataColumn("TimeLimit", 15),
        new SchedulerDataColumn("TimeUsed", 15),
    ];

    public getQueue(): Thenable<Job[]> {
        const output = this.getQueueOutput();
        return output.then((o) => {
            if (o) {
                return this.parseQueueOutput(o);
            } else {
                return [];
            }
        }, (error) => {
            vscode.window.showErrorMessage(`Failed to get queue.\nError: ${error}`);
            return [];
        });
    }

    public cancelJob(job: Job): void {
        try {
            execSync(`scancel ${job.id}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to cancel job ${job.id}.\nError: ${error}`);
        }
    }

    public submitJob(jobScript: string|vscode.Uri): void {
        try {
            const setCWD = vscode.workspace.getConfiguration("slurm-dashboard").get("setJobWorkingDirectoryToScriptDirectory", true);

            let jobScriptPath: string;
            if (typeof jobScript === "string") {
                jobScriptPath = jobScript;
            } else {
                jobScriptPath = jobScript.fsPath;
            }

            let cwdArg = "";
            if (setCWD) {
                const cwd = getParentDirectory(jobScriptPath);
                cwdArg = `--chdir=${cwd}`;
            }

            execSync(`sbatch ${jobScriptPath} ${cwdArg}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to submit job ${jobScript}.\nError: ${error}`);
        }
    }

    private getQueueOutput(): Thenable<string|undefined> {
        const columnsString = this.columns.join(",");
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

    private parseQueueOutput(output: string): Job[] {
        let jobs: Job[] = [];

        /* iterate thru each line of output */
        output.split("\n").forEach((line) => {
            if (line === undefined || line === "") {
                return;
            }

            /* split line into columns by whitespace */
            let columns = line.split(/\s+/);

            /* parse columns into job */
            let results: {[key: string]: string} = {};
            const zip = (a: any, b: any) => a.map((k: any, i: any) => [k, b[i]]);
            for (let [col, val] of zip(this.columns, columns)) {
                results[col.name] = val;
            }

            /* create job */
            let job = new Job(
                results["JobID"],
                results["Name"],
                results["State"],
                results["Partition"],
                results["Command"],
                results["STDOUT"],
                WallTime.fromString(results["TimeLimit"]),
                WallTime.fromString(results["TimeUsed"])
            );
            jobs.push(job);

        });

        return jobs;
    }

}

export class Debug implements Scheduler {
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

    public getQueue(): Thenable<Job[]> {
        return Promise.resolve(this.jobs);
    }

    public cancelJob(job: Job): void {
        this.jobs = this.jobs.filter((j) => j.id !== job.id);
        vscode.window.showInformationMessage(`Cancel job ${job.id}`);
    }

    public submitJob(jobScript: string|vscode.Uri): void {
        vscode.window.showInformationMessage(`Submit job ${jobScript}`);
    }
}

export function getScheduler(): Scheduler {
    const schedulerType = vscode.workspace.getConfiguration("slurm-dashboard").get("backend", "slurm");
    if (schedulerType === "slurm") {
        return new SlurmScheduler();
    } else if (schedulerType === "debug") {
        return new Debug();
    } else {
        vscode.window.showErrorMessage(`Unknown scheduler type: ${schedulerType}. Defaulting to slurm.`);
        return new SlurmScheduler();
    }
}