# Contributing Guidelines

This extension is completely [open
source](https://github.com/Dando18/slurm-dashboard) and contributions are
welcome. Here I've outline some helpful tips for how I develop locally.

## Testing Changes Locally

### Unit Tests

There are unit tests in the [src/test](src/test) directory. They can be run with
`npm run test -- stable`. The last arg `stable` specifies to test on the most
recent stable release of vscode. You can also pass another vscode version. If
you're developing within vscode, then you can also run the "Extension Tests"
within the Run and Debug UI. All tests should pass.
You can also look at code coverage in the testing with `npm run coverage`.
Other useful developing commands are listed below:

-   `npm run test -- {vscode_version}` -- run unit tests on vscode version
-   `npm run coverage` -- collect code coverage data for unit tests
-   `npm run check-format` -- check if the code is in the correct format
-   `npm run format` -- format all files to the correct format
-   `npm run package` -- create a vsix package for distributing extension

### Testing Locally

You can directly run the extension locally using the Run and Debug UI in VSCode.
Just select Run Extension and hit run. Unless you have slurm installed locally
this won't be very useful. You can select "Debug" as the scheduling backend in
the seconds if you just want to see temp data in the UI.

### Testing on Remote System

You're most likely running on a separate system with slurm using the VSCode
Remote SSH extension. To test on a separate system you need to first create
a .vsix bundle using `npm run package`. This will create a .vsix package in the
root of the repo. Copy this file to your remote system and connect in VSCode
with Remote SSH. Use the `Extensions: Install from VSIX` action (CMD/CTRL + SHIFT + P)
to install an extension from a vsix file. Now you have your test version of the
extension installed on the remote system.

Note, if you already have slurm-dashboard installed, then you'll need to
uninstall it and set `"extensions.autoUpdate": false` in your user settings to
prevent VSCode from trying to grab a newer install from vscode marketplace.
