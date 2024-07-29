<p align="center"><img align="center" width="64" src="./images/icon.png"/></p>
<h1 align="center">Slurm Dashboard</h1>

<b>A dashboard for interacting with the Slurm workload manager in VSCode. It allows
you to see running jobs, cancel jobs, submit new jobs, and more.</b>

[![Visual Studio Code](https://img.shields.io/badge/--007ACC?logo=visual%20studio%20code&logoColor=ffffff)](https://marketplace.visualstudio.com/items?itemName=danielnichols.slurm-dashboard)&nbsp;[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/danielnichols.slurm-dashboard)](https://marketplace.visualstudio.com/items?itemName=danielnichols.slurm-dashboard)&nbsp;[![GitHub release (with filter)](https://img.shields.io/github/v/release/Dando18/slurm-dashboard)](https://github.com/Dando18/slurm-dashboard/releases)&nbsp;[![GitHub license](https://badgen.net/github/license/Dando18/slurm-dashboard)](https://github.com/Dando18/slurm-dashboard/blob/main/LICENSE)&nbsp;[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/Dando18/slurm-dashboard/.github%2Fworkflows%2Fci.yaml?logo=github&label=ci)](https://github.com/Dando18/slurm-dashboard/actions/workflows/ci.yaml)&nbsp;[![codecov](https://codecov.io/gh/Dando18/slurm-dashboard/graph/badge.svg?token=8A3X8EB2L9)](https://codecov.io/gh/Dando18/slurm-dashboard)

## Features

There are two main views in this extension: Job Queue and Job Scripts. The first
view is a list of all current user jobs in the queue. Actions are provided for
canceling, resubmitting, and inspecting the jobs. The second view shows all
detected job scripts and provides actions for inspecting and/or running them.
These views are shown in the highlight below.

![Overview](images/overview.gif)

## Requirements

This extension requires Slurm to be on the system where the workspace is
located. Currently it only works with Slurm, but PBS, BSUB, and Flux support is
planned.

## Extension Settings

This extension contributes the following settings:

-   `slurm-dashboard.job-dashboard.showJobInfo`: Show all job metadata in the
    job list. Default: `false`
-   `slurm-dashboard.job-dashboard.promptBeforeCancel`: Prompt user before
    canceling a job. Default: `true`
-   `slurm-dashboard.job-dashboard.promptBeforeCancelAll`: Prompt user before
    cancelling all jobs. Default: `true`
-   `slurm-dashboard.job-dashboard.refreshInterval`: How many seconds between
    refreshes of the job queue view. Set to `null` to turn off auto-refresh.
    Default: `300`
-   `slurm-dashboard.job-dashboard.extrapolationInterval`: Extrapolate the job
    run times in the UI without querying the workload manager. Allows you to set
    a high job-dashboard.refreshInterval, but still see more realistic job run
    times. This has the danger of coming out of sync with the real times or not
    portraying job completion/failure, so it is turned off by default. Provide a
    number to specify the interval in seconds or `null` to disable
    extrapolation. Default: `null`
-   `slurm-dashboard.job-dashboard.persistJobs`: Keep completed jobs in the job
    dashboard until they are removed with the X button. Default: `false`
-   `slurm-dashboard.job-dashboard.useNativeIcons`: Instead of the job status
    icons shipped with the extension, use VSCode native codicons. Default:
    `false`
-   `slurm-dashboard.job-dashboard.sortBy`: Sort the job list by this column.
    Set to `null` to leave the order returned by the workload manager. Choices:
    `id`, `name`, `time left`, `status`. Default: `null`
-   [DEPRECATED] `slurm-dashboard.submit-dashboard.jobScriptExtensions`: Use
    jobScriptPatterns setting. File extensions used to identify job scripts.
    Default: `[".sbatch", ".slurm", ".job"]`
-   `slurm-dashboard.submit-dashboard.jobScriptPatterns`: Glob patterns to
    identify job scripts. Default: `["**/*.slurm", "**/*.sbatch", "**/*.job"]`
-   `slurm-dashboard.submit-dashboard.promptBeforeSubmitAll`: Prompt user before
    submitting all job scripts. Default: `true`
-   `slurm-dashboard.submit-dashboard.sortBy`: Sort the job script list by this
    column. Set to `null` to leave the order the glob pattern discovered the
    files. Choices: `filename`, `rel path`, `last modified`, `newest`, `oldest`.
    Default: `last modified`
-   `slurm-dashboard.setJobWorkingDirectoryToScriptDirectory`: Launch job
    scripts with the working directory as the location of the job script.
    Default: `true`
-   `slurm-dashboard.backend`: Scheduler backend. Choices: `slurm`, `debug`.
    Default: `slurm`
-   `slurm-dashboard.slurm-backend.squeueUserArg`: By default `--me` is passed
    to squeue to get the users jobs. Slurm versions older than 20.02 do not
    support `--me`. This settings provides a way to fallback to the `--user`
    flag instead. Choices: `me`, `user`. Default: `me`

Most notable is the `job-dashboard.refreshInterval` setting. The job queue view
refreshes its data at regular intervals. To avoid overloading the login nodes or
the workload manager the refresh interval is set to a high value. By default it
is 300 seconds. This can be changed to the users preference or auto-refresh can
be turned off entirely by setting it to `null`.

If you still want to see live job times, you can set
`job-dashboard.extrapolationInterval`, which will extrapolate the current job
time based on the last available value from the workload manager. This will make
the UI more informative, but has the danger of coming out of sync with the real
job times and/or not capturing job completion and failure. However, these will
be corrected the next time the jobs are refreshed from the queue. Due to these
reasons extrapolation is turned off by default. An example of what this looks
like when enabled is shown below.

![Time Extrapolation Example Gif](images/time-extrapolate-example.gif)

## Known Issues

### Submitting Issues

Issues can be submitted under the [issues tab on GitHub](https://github.com/Dando18/slurm-dashboard/issues).

## Release Notes

See the [Changelog](/CHANGELOG.md) for the entire change history.

### 0.0.12

-   adds ability to persist jobs in the job view so that they stay until
    deleted. See the `slurm-dashboard.job-dashboard.persistJobs` setting.

# License

Copyright Daniel Nichols 2024

Slurm Dashboard is published under the [Apache 2.0 license](/LICENSE).
