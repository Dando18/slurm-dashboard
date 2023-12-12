import * as vscode from 'vscode';
import { execSync, exec } from 'child_process';
import { WallTime } from "./time";

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
            return new WallTime(0, 0, this.maxTime.absDiffSeconds(this.curTime));
        } else {
            return undefined;
        }
    }
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
        });
    }

    public cancelJob(job: Job): void {
        try {
            //execSync(`scancel ${job.id}`);
            console.log(`scancel ${job.id}`);
        } catch (error) {
            console.log(error);
        }
    }

    public submitJob(jobScript: string|vscode.Uri): void {
        try {
            /* todo -- run from working directory of script */
            //execSync(`sbatch ${jobScript}`);
            console.log(`sbatch ${jobScript}`);
        } catch (error) {
            console.log(error);
        }
    }

    private getQueueOutput(): Thenable<string|undefined> {
        const columnsString = this.columns.join(",");
        const command = `squeue --me --noheader -O ${columnsString}`;
        console.log(command);

        const workspaceFolder = vscode.workspace.workspaceFolders![0];
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, "squeue.out");

        return vscode.workspace.openTextDocument(filePath).then((doc) => doc.getText());

        //return new Promise((resolve, reject) => {
        //    exec(command, (error, stdout, stderr) => {
        //        if (error) {
        //            reject(error);
        //        } else if (stderr) {
        //            reject(stderr);
        //        } else {
        //            resolve(stdout);
        //        }
        //    });
        //});
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