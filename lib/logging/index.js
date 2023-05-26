"use strict";

const { threadId } = require("node:worker_threads");

const winston = require("winston");
const { combine, colorize, label, printf, timestamp } = winston.format;

const fileTransport =
    new winston.transports.File({
        filename: "./log/resize.log",
        level: "info",
        format:
            combine(
                timestamp(),
                label({ label: `Thread Id: ${threadId.toString().padStart(2, "0")}`}),
                printf(
                    ({ level, message, label, timestamp }) =>
                        `${timestamp} [${label}] ${message}`))
    });

const consoleTransport =
    new winston.transports.Console({
        level: "debug",
        format:
            combine(
                colorize({ all: true }),
                timestamp(),
                label({ label: `Thread Id: ${threadId.toString().padStart(2, "0")}`}),
                printf(
                    ({ level, message, label, timestamp }) =>
                        `${timestamp} [${label}] ${message}`))
    });

const logger =
    winston.createLogger({
        transports: [
            fileTransport,
            consoleTransport
        ]
    });

module.exports = logger;