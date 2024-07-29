#!/usr/bin/env python3
from argparse import ArgumentParser
import os
import sys

# parse args
parser = ArgumentParser()
parser.add_argument('--jobfile', type=str, default='/tmp/.jobfile')
subparsers = parser.add_subparsers(dest='command')
subparsers.add_parser('sreset')

sbatch_parser = subparsers.add_parser('sbatch')
sbatch_parser.add_argument('script', type=str)

squeue_parser = subparsers.add_parser('squeue')
squeue_parser.add_argument('--me', action='store_true')
squeue_parser.add_argument('--noheader', action='store_true')
squeue_parser.add_argument('-O', type=str)

scancel_parser = subparsers.add_parser('scancel')
scancel_parser.add_argument('jobid', type=str)

scontrol_parser = subparsers.add_parser('scontrol')
scontrol_subparsers = scontrol_parser.add_subparsers(dest='subcommand')
show_parser = scontrol_subparsers.add_parser('show')
show_parser.add_argument('field', type=str)
show_parser.add_argument('value', type=str)

args = parser.parse_args()

# Job wrapper class
class Job:
    def __init__(self, id, name, status, queue, nodeList, batchFile, outputFile, maxTime, curTime):
        self.id = id
        self.name = name
        self.status = status
        self.queue = queue
        self.nodeList = nodeList
        self.batchFile = batchFile
        self.outputFile = outputFile
        self.maxTime = maxTime
        self.curTime = curTime

    def __str__(self):
        return f'{self.id} {self.name} {self.status} {self.queue} {self.nodeList} {self.batchFile} {self.outputFile} {self.maxTime} {self.curTime}'

    @staticmethod
    def fromStr(s: str):
        id, name, status, queue, nodeList, batchFile, outputFile, maxTime, curTime = s.split()
        return Job(id, name, status, queue, nodeList, batchFile, outputFile, maxTime, curTime)


def write_jobs(job_list):
    with open(args.jobfile, 'w') as f:
        for job in job_list:
            f.write(str(job) + '\n')

def read_jobs():
    if not os.path.exists(args.jobfile):
        exit(1)
    with open(args.jobfile, 'r') as f:
        return [Job.fromStr(line) for line in f]

def sbatch(script):
    jobs = read_jobs()
    max_id = max([int(job.id) for job in jobs])
    job_name = os.path.basename(script).split('.')[0]
    output = f"{job_name}-{max_id+1}.out"
    job = Job(str(max_id+1), job_name, 'PENDING', '[]', 'batch', script, output, '00:00:00', '00:00:00')
    jobs.append(job)
    write_jobs(jobs)
    print(f'Submitted batch job {job.id}')

def squeue(me=False, noheader=False, O=None):
    assert me, 'squeue requires --me'
    assert noheader, 'squeue requires --noheader'
    assert O is not None, 'squeue requires -O'

    jobs = read_jobs()
    for j in jobs:
        fields = [j.id, j.name, j.status, j.queue, j.nodeList, j.queue, j.outputFile, j.maxTime, j.curTime, j.batchFile]
        print('   '.join(fields))

def scancel(jobid):
    jobs = read_jobs()
    jobs = [j for j in jobs if j.id != jobid]
    write_jobs(jobs)
    print(f'Canceled job {jobid}')

def scontrol_show(field, value):
    assert field == 'job', 'scontrol show only supports job info'
    jobs = read_jobs()
    jobs = [j for j in jobs if j.id == value]
    for j in jobs:
        print(f'JobId={j.id}')
        print(f'JobName={j.name}')
        print(f'JobState={j.status}')
        print(f'NodeList={j.nodeList}')
        print(f'Partition={j.queue}')
        print(f'Command={j.batchFile}')
        print(f'StdOut={j.outputFile}')
        print(f'Timelimit={j.maxTime}')


# reset data in file
if args.command == 'sreset':
    jobs = [
        Job('123456', 'job1', 'COMPLETED', 'batch', '[]', 'job1.sbatch', 'job1.out', '1-00:00:00', '01:37:16'),
        Job('123457', 'job2', 'RUNNING', 'batch', '[node1]', 'job2.sbatch', 'job2.out', '06:00:00', '00:14:39'),
        Job('123458', 'job3', 'PENDING', 'batch', '[]', 'more/job3.job', 'job3.out', '00:15:00', '00:00:00'),
    ]
    write_jobs(jobs)
elif args.command == 'sbatch':
    sbatch(args.script)
elif args.command == 'squeue':
    squeue(args.me, args.noheader, args.O)
elif args.command == 'scancel':
    scancel(args.jobid)
elif args.command == 'scontrol':
    if args.subcommand == 'show':
        scontrol_show(args.field, args.value)
    else:
        raise NotImplementedError

