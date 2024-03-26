#!/bin/sh

if [ ! -f "runTest.ts" ]; then
    if [ -d "test" ]; then
        cd test
    elif [ -d "src/test" ]; then
        cd src/test
    else
        echo "Error: Could not find test directory"
        exit 1
    fi
fi

cwd=$(pwd)
mkdir -p ./bin

createCommand() {
    echo "#!/bin/sh" > ./bin/$1
    echo "${cwd}/slurm-wrapper.py $1 \"\$@\"" >> ./bin/$1
    chmod +x ./bin/$1
}

createCommand sbatch
createCommand squeue
createCommand scancel
createCommand scontrol
createCommand sreset