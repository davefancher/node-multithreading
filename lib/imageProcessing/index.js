"use strict";

const path = require("node:path");

const jimp = require("jimp");
const winston = require("winston");

const { PIPE, PIPE_SYNC } = require("../extensions");

const JPEG = require('jpeg-js');
jimp.decoders['image/jpeg'] = (data) => JPEG.decode(data, {
    maxMemoryUsageInMB: 4096,
});

const resize =
    async ({ scale, inputBuffer }) => {
        try {
            setTimeout(() => winston.debug(`setTimeout in resize to ${scale}%`), 0);
            setImmediate(() => winston.debug(`setImmediate in resize to ${scale}%`));

            winston.info(`Resizing to ${scale}%`);

            const image = await jimp.read(inputBuffer);
            const mime = image.getMIME();

            const newWidth = image.getWidth() * (scale / 100);
            const newHeight = jimp.AUTO;

            const newImage = image.resize(newWidth, newHeight);

            return await newImage.getBufferAsync(mime);
        } catch (ex) {
            winston.error(ex.message);

            return ex.message;
        }
    };

module.exports = {
    resize
};
