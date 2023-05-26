"use strict";

const os = require("node:os");
const path = require("node:path");
const { Worker, SHARE_ENV } = require("node:worker_threads");

const { PIPE_SYNC } = require("../extensions");
const { createThreadPool } = require("../threading");

module.exports =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Thread Pool)`);

        const workerScriptPath = path.resolve("./resizeWorker.js");
        const threadPool = createThreadPool(workerScriptPath, 6);
        // const threadPool = createThreadPool(workerScriptPath, os.cpus().length);

        void await options
            .targetScales
            .map(scale =>
                threadPool
                    .runTask({
                        targetDirectory: options.targetDirectory,
                        sourceFileName: options.sourceFileName,
                        scale: scale,
                        inputBuffer: options.inputBuffer
                    }))
            [PIPE_SYNC](promises => Promise.allSettled(promises))
    };
