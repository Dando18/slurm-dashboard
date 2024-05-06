# Change Log

### 0.0.12

-   adds ability to persist jobs in the job view so that they stay until 
    deleted. See the `slurm-dashboard.job-dashboard.persistJobs` setting. 

### 0.0.11

-   lowered minimum required vscode version to 1.81.1 and added testing for more
    vscode releases

### 0.0.10

-   added option `slurm-dashboard.slurm-backend.squeueUserArg` to enable passing
    `--user=$USER` instead of `--me` to squeue for versions of Slurm older than
    20.02

### 0.0.9

-   bug fix: handle unlimited wall time for jobs

### 0.0.8

-   handle all slurm output file patterns by getting the output file path from `scontrol`

### 0.0.7

-   fix submit issue, so now submitting jobs should work on all systems
-   fix bug with parsing _Command_ column of squeue
-   support for finding job output files when they contains special substitutions
    (i.e. `output-%A.txt`)
-   increased documentation

### 0.0.6

-   enabling time formatting for multi-day jobs

### 0.0.5

-   add sorting in UI for jobs and job scripts; several options for sorting order
-   more complete CI testing

### 0.0.4

-   added option to extrapolate job run times in the UI

### 0.0.3

-   update icons for job queue

### 0.0.2

-   update logo and readme

### 0.0.1

-   initial release
-   slurm support
-   job queue view
-   job script view
