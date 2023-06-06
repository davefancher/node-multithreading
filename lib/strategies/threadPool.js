"use strict";

const os = require("node:os");
const path = require("node:path");
const { Worker, SHARE_ENV } = require("node:worker_threads");

const winston = require("winston");

const { PIPE_SYNC } = require("../extensions");

const { createThreadPool } = require("../threading");

const workerScriptPath = path.join(__dirname, "workerThreadResize.js");
const threadPool = createThreadPool(workerScriptPath, 6);
// const threadPool = createThreadPool(workerScriptPath, os.cpus().length);

module.exports =
    options => {
        winston.info(`Processing ${options.sourceFileName} (Thread Pool)`);

        return options
            .targetScales
            .map(scale =>
                threadPool
                    .runTask({
                        targetDirectory: options.targetDirectory,
                        sourceFileName: options.sourceFileName,
                        scale: scale,
                        inputBuffer: options.inputBuffer
                    }))
            [PIPE_SYNC](promises => Promise.allSettled(promises));
    };
