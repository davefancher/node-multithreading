"use strict";

const path = require("node:path");
const { threadId } = require("node:worker_threads");

const jimp = require("jimp");

const JPEG = require('jpeg-js');
const { PIPE, PIPE_SYNC } = require("../extensions");

jimp.decoders['image/jpeg'] = (data) => JPEG.decode(data, {
    maxMemoryUsageInMB: 4096,
});

const resize =
    async ({ scale, inputBuffer }) => {
        try {
            setImmediate(() => console.warn(`--> [threadId: ${threadId}] setImmediate in resize to ${scale}%`));

            console.info(`[threadId: ${threadId}] Resizing to ${scale}%`);

            const image = await jimp.read(inputBuffer);
            const mime = image.getMIME();

            const newWidth = image.getWidth() * (scale / 100);
            const newHeight = jimp.AUTO;

            const newImage = image.resize(newWidth, newHeight);

            return await newImage.getBufferAsync(mime);
        } catch (ex) {
            console.error(ex);

            return ex.message;
        }
    };

module.exports = {
    resize
};
