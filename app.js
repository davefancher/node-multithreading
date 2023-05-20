#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const dayjs = require("dayjs");
const duration = require("dayjs/plugin/duration");
dayjs.extend(duration);

const { PIPE, PIPE_SYNC, TEE_SYNC, WITH_TIMING } = require("./lib/extensions");

//const TARGET_SCALES = [ 25, 50, 75, 200 ];
const TARGET_SCALES = [ 10, 20, 30, 40, 50, 60, 70, 80, 90, 150, 200 ];

const RESIZE_STRATEGIES = Object.freeze({
    SERIAL: "serial",
    PARALLEL: "parallel",
    WORKER_THREAD: "workerThread",
    THREAD_POOL: "threadPool",
    THREAD_POOL_WITH_SHARED_BUFFER: "threadPoolWithSharedBuffer"
});

//const strategy = RESIZE_STRATEGIES.THREAD_POOL_WITH_SHARED_BUFFER;
const [ ,, sourceFile, strategy ] = process.argv;

sourceFile
    [PIPE_SYNC](path.resolve)
    [PIPE_SYNC](
        sourceFilePath => ({
            sourceFileName: path.parse(sourceFilePath).base,
            buffer: fs.readFileSync(sourceFilePath),
            targetDirectory: path.join(__dirname, "output", dayjs().format("YYYYMMDD_HHmmss") + "_" + strategy),
            targetScales: TARGET_SCALES
        }))
    [TEE_SYNC](options => {
        if(!fs.existsSync(options.targetDirectory)) {
            fs.mkdirSync(options.targetDirectory);
        }
    })
    [PIPE_SYNC](
        `./lib/strategies/${strategy}`
            [PIPE_SYNC](require)
            [WITH_TIMING]("Resize", "info"))
    [PIPE](process.exit);
