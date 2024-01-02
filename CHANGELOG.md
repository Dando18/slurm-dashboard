# Change Log

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
