"use strict";

const path = require("node:path");

const jimp = require("jimp");

const { PIPE, PIPE_SYNC } = require("../extensions");
const logger = require("../logging");

const JPEG = require('jpeg-js');
jimp.decoders['image/jpeg'] = (data) => JPEG.decode(data, {
    maxMemoryUsageInMB: 4096,
});

const resize =
    async ({ scale, inputBuffer }) => {
        try {
            setTimeout(() => logger.debug(`setTimeout in resize to ${scale}%`), 0);
            setImmediate(() => logger.debug(`setImmediate in resize to ${scale}%`));

            logger.info(`Resizing to ${scale}%`);

            const image = await jimp.read(inputBuffer);
            const mime = image.getMIME();

            const newWidth = image.getWidth() * (scale / 100);
            const newHeight = jimp.AUTO;

            const newImage = image.resize(newWidth, newHeight);

            return await newImage.getBufferAsync(mime);
        } catch (ex) {
            logger.error(ex);

            return ex.message;
        }
    };

module.exports = {
    resize
};
