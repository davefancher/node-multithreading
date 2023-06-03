"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");

const winston = require("winston");

const writeToFile =
    (targetDirectory, sourceFileName, ...specifiers) => {
        const { name: baseFileName, ext: extension } = path.parse(sourceFileName);
        const targetFileName = `${baseFileName}@${specifiers.join("_")}${extension}`;

        const outputFileName = path.join(targetDirectory, targetFileName);

        return buffer => {
            setTimeout(() => winston.debug(`setTimeout in writeToFile to ${specifiers[0]}`), 0);
            setImmediate(() => winston.debug(`setImmediate in writeToFile to ${specifiers[0]}`));

            winston.info(`Writing file for ${specifiers[0]}`);

            return fs
                .writeFile(outputFileName, buffer)
                .then(() => outputFileName);
        }
    };

module.exports = {
    writeToFile
};