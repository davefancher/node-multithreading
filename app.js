"use strict";

const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");
const { Writable } = require("node:stream");
const { threadId } = require("node:worker_threads");

const dayjs = require("dayjs");
const express = require("express");
const { Server: SocketIOServer } = require("socket.io");
const winston = require("winston");
const { combine, colorize, printf, json, timestamp } = winston.format;

const { LOG_LEVEL, PROCESSING_STRATEGY } = require("./lib/constants");
const { PIPE, PIPE_SYNC, TEE_SYNC, WITH_TIMING } = require("./lib/extensions");

const TARGET_SCALES = [ 10, 20, 30, 40, 50, 60, 70, 80, 90, 150, 175, 200 ];
// const TARGET_SCALES = [ 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 150, 175, 200 ];

let lastCpuTimes = os.cpus();

const getAverageUsage =
    lastTimes =>
        os
            .cpus()
            .map(
                (cpu, ix) => {
                    const lastCpuTime = lastTimes[ix];
                    const deltas = {
                        user: cpu.times.user - lastCpuTime.times.user,
                        sys: cpu.times.sys - lastCpuTime.times.sys,
                        idle: cpu.times.idle - lastCpuTime.times.idle
                    };
                    const percentage = 1 - deltas.idle / (deltas.user + deltas.sys + deltas.idle);

                    return {
                        model: cpu.model,
                        times: cpu.times,
                        percentage
                    };
                });

const conditionalLabel =
    winston.format((info, opts) => {
        if (Reflect.has(info, "label")) {
            return info;
        }

        Reflect.set(info, "label", opts.label);

        return info;
    });

const formatGeneratedFileNameAsUrl =
    baseUrl =>
        generatedFileName =>
            generatedFileName
                [PIPE_SYNC](path.parse)
                [PIPE_SYNC](
                    p =>
                        new URL(
                            `assets/images/generated/${path.basename(p.dir)}/${encodeURI(p.base)}`,
                            baseUrl)
                            .toString());

const logLibuvThreadPoolSize =
    () =>
        winston.debug(`UV_THREADPOOL_SIZE = ${process.env.UV_THREADPOOL_SIZE ?? "4 (default)"}`);

const initOutputDirectory =
    options => {
        if(!fs.existsSync(options.targetDirectory)) {
            fs.mkdirSync(options.targetDirectory);
        }
    };

const finalizeResize =
    (socket, strategy) =>
        result => {
            if (!socket.connected) {
                console.error("Socket disconnected!");
                return;
            }

            const convertFileNameToLocalhostUrl = formatGeneratedFileNameAsUrl("http://localhost");

            socket.emit(
                "resize-complete",
                {
                    strategy,
                    files:
                        result
                            .map(({ value: fn }) => convertFileNameToLocalhostUrl(fn))
                });
        };

const doResize =
    (socket, strategy) =>
        (fileName, fileBuffer) => ({
            sourceFileName: fileName,
            inputBuffer: fileBuffer,
            targetDirectory: path.join(__dirname, "output", dayjs().format("YYYYMMDD_HHmmss") + "_" + strategy),
            targetScales: TARGET_SCALES
        })
        [TEE_SYNC](logLibuvThreadPoolSize)
        [TEE_SYNC](initOutputDirectory)
        [PIPE_SYNC](
            `./lib/strategies/${strategy}`
                [PIPE_SYNC](require)
                [WITH_TIMING](`Resize (${strategy})`, "info"))
        [PIPE](finalizeResize(socket, strategy));

const httpServer =
    express()
        .use("/assets/images/generated", express.static("./output"))
        .use("/lib/chartjs", express.static("./node_modules/chart.js/dist"))
        .use("/lib/revealjs", express.static("./node_modules/reveal.js/dist"))
        .use("/lib/revealjs/plugins", express.static("./node_modules/reveal.js/plugin"))
        .use("/lib/revealjs/plugins/mermaid", express.static("./node_modules/reveal.js-mermaid-plugin/plugin/mermaid"))
        .use("/", express.static("./client/"))
        [PIPE_SYNC](http.createServer);

const io =
    new SocketIOServer(
        httpServer,
        {
            maxHttpBufferSize: 1e8,
            transports: [ "websocket" ]
        })
        .on("connection",
            socket =>
                PROCESSING_STRATEGY
                    [PIPE_SYNC](Object.values)
                    .reduce(
                        (s, strategy) =>
                            s.on(`resize-${strategy}`, doResize(s, strategy)),
                            socket));

winston
    .add(new winston.transports.Console({
        level: LOG_LEVEL.DEBUG,
        format:
            combine(
                colorize({ all: true }),
                timestamp(),
                conditionalLabel({ label: `[${process.pid}:${threadId.toString().padStart(2, "0")}]`}),
                printf(
                    ({ level, message, label, timestamp }) =>
                        `${timestamp} ${level.padEnd(10, " ")} ${label} ${message}`))
    }))
    .add(new winston.transports.Stream({
        level: LOG_LEVEL.DEBUG,
        stream: new Writable({
            write (chunk, encoding, callback) {
                io.emit("log", chunk.toString());
                callback();
            }
        }),
        format: combine(
            timestamp(),
            conditionalLabel({ label: `[${process.pid}:${threadId.toString().padStart(2, "0")}]`}),
            json())
    }));

setInterval(
    () => {
        lastCpuTimes = getAverageUsage(lastCpuTimes);

        io.emit(
            "cpu",
            lastCpuTimes
                .map(cpu => ({ model: cpu.model, percentage: cpu.percentage })));
    },
    1000);

const HTTP_PORT = 80;
httpServer.listen(HTTP_PORT);

winston.info(`Listening on ${HTTP_PORT}`);
