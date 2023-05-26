#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const dayjs = require("dayjs");

const { PIPE, PIPE_SYNC, TEE_SYNC, WITH_TIMING } = require("./lib/extensions");

// const TARGET_SCALES = [ 25, 50, 75, 200 ];
const TARGET_SCALES = [ 10, 20, 30, 40, 50, 60, 70, 80, 90, 150, 200 ];

const RESIZE_STRATEGIES = Object.freeze({
    SERIAL: "serial",
    PARALLEL: "parallel",
    WORKER_THREAD: "workerThread",
    THREAD_POOL: "threadPool"
});

const [ sourceFile, strategy ] =
    process
        .argv
        .slice(2)
        [PIPE_SYNC](args => [
            args[0],
            args[1].replace(/\d{2} - /, "")
        ]);

sourceFile
    [PIPE_SYNC](path.resolve)
    [PIPE_SYNC](
        sourceFilePath => ({
            sourceFileName: path.parse(sourceFilePath).base,
            inputBuffer: fs.readFileSync(sourceFilePath),
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
            [WITH_TIMING](`Resize (${strategy})`, "info"))
    [PIPE](process.exit);
