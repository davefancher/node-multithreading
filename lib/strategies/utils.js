"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const logger = require("../logging");

const writeToFile =
    (targetDirectory, sourceFileName, ...specifiers) => {
        const { name: baseFileName, ext: extension } = path.parse(sourceFileName);
        const targetFileName = `${baseFileName}@${specifiers.join("_")}${extension}`;

        const outputFileName = path.join(targetDirectory, targetFileName);

        return buffer => {
            setTimeout(() => logger.debug(`setTimeout in writeToFile to ${specifiers[0]}`), 0);
            setImmediate(() => logger.debug(`setImmediate in writeToFile to ${specifiers[0]}`));

            logger.info(`Writing file for ${specifiers[0]}`);

            return fs
                .writeFile(outputFileName, buffer)
                .then(() => outputFileName);
        }
    };

module.exports = {
    writeToFile
};