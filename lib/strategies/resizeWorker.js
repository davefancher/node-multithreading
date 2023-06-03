"use strict";

const { Writable } = require("node:stream")
const { parentPort, threadId } = require("node:worker_threads");

const winston = require("winston");
const { label } = winston.format;

const { LOG_LEVEL } = require("../constants");
const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const { writeToFile } = require("./utils");

winston
    .add(
        new winston.transports.Stream({
            level: LOG_LEVEL.SILLY,
            stream: new Writable({
                objectMode: true,
                write (chunk, encoding, callback) {
                    parentPort.postMessage({
                        type: "log",
                        data: chunk
                    });

                    callback();
                }
            }),
            format: label({ label: `[Thread Id: ${threadId.toString().padStart(2, "0")}]` })
        }))
    .on("error", err => console.error(err));

parentPort.on(
    "message",
    ({ targetDirectory, sourceFileName, scale, inputBuffer }) => {
        try {
            ({ scale, inputBuffer: inputBuffer.buffer })
                [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`, "info"))
                [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "info"))
                [PIPE](targetFileName => parentPort.postMessage({ type: "return", data: targetFileName }));
        } catch (ex) {
            parentPort.postMessage(ex);
        }
    });
