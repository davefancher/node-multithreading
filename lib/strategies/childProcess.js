"use strict";

const { fork } = require("node:child_process");
const path = require("node:path");

const winston = require("winston");

module.exports =
    options => {
        winston.info(`Processing ${options.sourceFileName} (Child Process)`);

        const workerScriptPath = path.join(__dirname, "childProcessResize.js");

        return new Promise(
            resolve => {
                const child =
                    fork(workerScriptPath)
                        .on(
                            "message",
                            msg => {
                                if (msg.status === "ready") {
                                    child.send({
                                        targetDirectory: options.targetDirectory,
                                        sourceFileName: options.sourceFileName,
                                        targetScales: options.targetScales,
                                        inputBuffer: options.inputBuffer
                                    });
                                } else if (msg.status === "log") {
                                    winston.log(msg.data);
                                } else if (msg.status === "resize-complete") {
                                    child.kill();
                                    resolve(msg.data);
                                }
                            })
                        .on(
                            "error",
                            err => {
                                winston.error(err.message);
                            }
                        );
            });
    };
