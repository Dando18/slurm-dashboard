import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { WallTime } from './time';


export class Job extends vscode.TreeItem {

    constructor(
        public id: string,
        public name: string, 
        public status: string, 
        public queue?: string, 
        public batchFile?: string, 
        public maxTime?: WallTime, 
        public curTime?: WallTime
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.description = `${curTime} / ${maxTime}`;
        this.iconPath = this.getIconPath();
        this.tooltip = `${name} (${status})`;
    }

    getIconPath(): string | vscode.Uri | vscode.ThemeIcon | undefined {
        if (this.status === "RUNNING") {
            return new vscode.ThemeIcon("play");
        } else if (this.status === "PENDING") {
            return new vscode.ThemeIcon("ellipsis");
        } else if (this.status === "COMPLETED") {
            return new vscode.ThemeIcon("check");
        } else {
            return undefined;
        }
    }

    public getTimeLeft(): WallTime|undefined {
        if (this.maxTime && this.curTime) {
            return new WallTime(0, 0, this.maxTime.absDiffSeconds(this.curTime));
        } else {
            return undefined;
        }
    }
}

export class JobQueueProvider implements vscode.TreeDataProvider<Job> {
    constructor(private dataProvider: JobQueueDataProvider) { }

    getTreeItem(element: Job): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: Job): vscode.ProviderResult<Job[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.dataProvider.getJobs());
        }
    }
}

interface JobQueueDataProvider {
    getJobs(): Job[];
}

class SchedulerColumn {
    constructor(public name: string, public chars: number) {}

    public toString(): string {
        return `${this.name}:${this.chars}`;
    }
}

export class SlurmDataProvider implements JobQueueDataProvider {
    private columns: SchedulerColumn[] = [
        new SchedulerColumn("JobID", 15),
        new SchedulerColumn("Name", 35),
        new SchedulerColumn("State", 25),
        new SchedulerColumn("Partition", 25),
        new SchedulerColumn("STDOUT", 255),
        new SchedulerColumn("Command", 255),
        new SchedulerColumn("TimeLimit", 15),
        new SchedulerColumn("TimeUsed", 15),
        new SchedulerColumn("QOS", 25),
    ];

    private getQueueOutput(): string|undefined {
        let columnsString = this.columns.join(",");
        try {
            let output = execSync(`squeue --me --noheader -O ${columnsString}`);
            return output.toString();
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    private parseQueueOutput(output: string): Job[] {
        let jobs: Job[] = [];
        /* iterate thru each line of output */
        output.split("\n").forEach((line) => {
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
                WallTime.fromString(results["TimeLimit"]),
                WallTime.fromString(results["TimeUsed"])
            );
            jobs.push(job);

        });

        return jobs;
    }

    public getJobs(): Job[] {
        //let jobs: Job[] = [];
        //jobs.push(new Job("1", "job1", "RUNNING", "batch", "batch.sh", WallTime.fromString("00:01:00"), WallTime.fromString("00:00:15")));
        //jobs.push(new Job("2", "job2", "PENDING", "batch", "batch.sh", WallTime.fromString("00:01:00"), WallTime.fromString("00:00:00")));
        //jobs.push(new Job("3", "job3", "COMPLETED", "batch", "batch.sh", WallTime.fromString("00:01:00"), WallTime.fromString("00:01:00")));
        //return jobs;
        let output = this.getQueueOutput();
        if (output) {
            return this.parseQueueOutput(output);
        } else {
            return [];
        }
    }
}