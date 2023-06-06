"use strict";

const { Writable } = require("node:stream");
const { threadId } = require("node:worker_threads");

const winston = require("winston");

const { LOG_LEVEL } = require("../constants");
const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const { writeToFile } = require("./utils");

const { combine, label, timestamp } = winston.format;

winston
    .add(new winston.transports.Stream({
        level: LOG_LEVEL.DEBUG,
        stream: new Writable({
            objectMode: true,
            write (chunk, encoding, callback) {
                process.send({ status: "log", data: chunk });
                callback();
            }
        }),
        format:
            combine(
                timestamp(),
                label({ label: `[${process.pid}:${threadId.toString().padStart(2, "0")}]`}))
    }));

process
    .on(
        "message",
        async ({ targetDirectory, sourceFileName, targetScales, inputBuffer }) => {
            const resizeResults =
                await targetScales
                    .map(scale =>
                        ({ scale, inputBuffer: Uint8Array.from(inputBuffer.data).buffer })
                            [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`), "info")
                            [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "info")))
                        [PIPE_SYNC](promises => Promise.allSettled(promises));

                process.send({
                    status: "resize-complete",
                    data: resizeResults
                });
        });

process.send({ status: "ready" });