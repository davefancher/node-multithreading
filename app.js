#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Worker, SHARE_ENV } = require("node:worker_threads");

const dayjs = require("dayjs");
const duration = require("dayjs/plugin/duration");
dayjs.extend(duration);

const { resize } = require("./lib/imageProcessing");
const { APPLY_TIMED, PIPE, PIPE_SYNC } = require("./lib/extensions");

const os = require("node:os");
const { createThreadPool } = require("./lib/threading");

//const TARGET_SCALES = [ 25, 50, 75, 200 ];
const TARGET_SCALES = [ 10, 20, 30, 40, 50, 60, 70, 80, 90, 150, 200 ];

const runSerial =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Serial)`);

        void await TARGET_SCALES
            .reduce(
                (p, scale) =>
                    p.then(() =>
                        resize(options.targetDirectory, options.sourceFileName, scale, options.buffer)
                            .then(r => console.info(`Wrote ${r}`))),
                Promise.resolve());
    };

const runParallel =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Parallel)`);

        void await TARGET_SCALES
            .map(scale =>
                    resize(options.targetDirectory, options.sourceFileName, scale, options.buffer)
                        .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](fns => Promise.allSettled(fns));
        };

const runWithWorkerThread =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Worker Thread)`);

        const workerScriptPath = path.join(__dirname, "worker.js");

        void await TARGET_SCALES
            .map(scale =>
                new Promise(
                    resolve =>
                        new Worker(workerScriptPath, { env: SHARE_ENV })
                            .on("message", resolve)
                            .postMessage({
                                targetDirectory: options.targetDirectory,
                                sourceFileName: options.sourceFileName,
                                scale: scale,
                                buffer: options.buffer
                            }))
                    .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](promises => Promise.allSettled(promises));
    };

const runWithThreadPool =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Thread Pool)`);

        const workerScriptPath = path.join(__dirname, "worker.js");
        const threadPool = createThreadPool(workerScriptPath, 4);
        //const threadPool = createThreadPool(workerScriptPath, os.cpus().length);

        void await TARGET_SCALES
            .map(scale =>
                threadPool
                    .runTask({
                        targetDirectory: options.targetDirectory,
                        sourceFileName: options.sourceFileName,
                        scale: scale,
                        buffer: options.buffer
                    })
                    .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](promises => Promise.allSettled(promises))
    };

const runWithThreadPoolAndSharedArrayBuffer =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Thread Pool with Shared Buffer)`);

        const workerScriptPath = path.join(__dirname, "worker.js");
        const threadPool = createThreadPool(workerScriptPath, 4);
        
        const sharedBuffer = new Uint8Array(new SharedArrayBuffer(options.buffer.length));
        sharedBuffer.set(options.buffer);

        void await TARGET_SCALES
            .map(scale =>
                threadPool
                    .runTask({
                        targetDirectory: options.targetDirectory,
                        sourceFileName: options.sourceFileName,
                        scale: scale,
                        buffer: sharedBuffer
                    })
                    .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](promises => Promise.allSettled(promises))
    };

const doResize = runWithThreadPool;

process
    .argv[2]
    [PIPE_SYNC](path.resolve)
    [PIPE_SYNC](
        sourceFilePath => ({
            sourceFileName: path.parse(sourceFilePath).base,
            buffer: fs.readFileSync(sourceFilePath),
            targetDirectory: path.join(__dirname, "output", dayjs().format("YYYYMMDD_HHmmss") + "_" + doResize.name)
        }))
    [PIPE_SYNC](options => {
        if(!fs.existsSync(options.targetDirectory)) {
            fs.mkdirSync(options.targetDirectory);
        }

        return options;
    })
    [PIPE_SYNC](doResize[APPLY_TIMED]("Resize", "info"))
    [PIPE](process.exit);
