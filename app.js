"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Writable } = require("node:stream");
const { threadId } = require("node:worker_threads");

const dayjs = require("dayjs");
const express = require("express");
const { Server: SocketIOServer } = require("socket.io");
const winston = require("winston");
const { combine, colorize, label, printf, json, timestamp } = winston.format;

const { LOG_LEVEL, PROCESSING_STRATEGY } = require("./lib/constants");
const { PIPE, PIPE_SYNC, TEE_SYNC, WITH_TIMING } = require("./lib/extensions");

const TARGET_SCALES = [ 10, 20, 30, 40, 50, 60, 70, 80, 90, 150, 200 ];

const doResize =
    (socket, strategy) =>
        fileBuffer => ({
            sourceFileName: "image.jpg",
            inputBuffer: fileBuffer,
            targetDirectory: path.join(__dirname, "output", dayjs().format("YYYYMMDD_HHmmss") + "_" + strategy),
            targetScales: TARGET_SCALES
        })
        [TEE_SYNC](options => {
            if(!fs.existsSync(options.targetDirectory)) {
                fs.mkdirSync(options.targetDirectory);
            }
        })
        [PIPE_SYNC](
            `./lib/strategies/${strategy}`
                [PIPE_SYNC](require)
                [WITH_TIMING](`Resize (${strategy})`, "info"))
        [PIPE](() => socket.emit("resize-complete", strategy))

const app = express();
const httpServer = http.createServer(app);

const io =
    new SocketIOServer(httpServer, { maxHttpBufferSize: 1e8 })
        .on("connection",
            socket =>
                PROCESSING_STRATEGY
                    [PIPE_SYNC](Object.values)
                    .reduce(
                        (s, strategy) =>
                            s.on(`resize-${strategy}`, doResize(s, strategy)),
                            socket));

const conditionalLabel =
    winston.format((info, opts) => {
        if (Reflect.has(info, "label")) {
            return info;
        }

        Reflect.set(info, "label", opts.label);

        return info;
    });

winston
    .add(new winston.transports.Console({
        level: LOG_LEVEL.DEBUG,
        format:
            combine(
                colorize({ all: true }),
                timestamp(),
                conditionalLabel({ label: `Thread Id: ${threadId.toString().padStart(2, "0")}`}),
                printf(
                    ({ level, message, label, timestamp }) =>
                        `${timestamp} ${level.padEnd(10, " ")} [${label}] ${message}`))
    }))
    // .add(new winston.transports.File({
    //     filename: "./log/resize.log",
    //     level: LOG_LEVEL.INFO,
    //     format:
    //         combine(
    //             timestamp(),
    //             conditionalLabel({ label: `Thread Id: ${threadId.toString().padStart(2, "0")}`}),
    //             printf(
    //                 ({ level, message, label, timestamp }) =>
    //                     `${timestamp}  ${level.padEnd(10, " ")} [${label}] ${message}`))
    // }))
    .add(new winston.transports.Stream({
        level: LOG_LEVEL.DEBUG,
        stream: new Writable({
            write (chunk, encoding, callback) {
                io.emit("log", chunk.toString());
                callback()
            }
        }),
        format: combine(
            timestamp(),
            conditionalLabel({ label: `[Thread Id: ${threadId.toString().padStart(2, "0")}]`}),
            json())
    }));

app.use("/", express.static("./client/"));

const HTTP_PORT = 80;
httpServer.listen(HTTP_PORT);

winston.info(`Listening on ${HTTP_PORT}`);
