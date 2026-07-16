#!/usr/bin/env node
import { createPrettyLog } from '@buujs/sati/pretty-log';
import { gracefulShutdown } from '../dist/shutdown/index.js';

const isMain = process.argv[1] === import.meta.filename;
const hasPipeInput = !process.stdin.isTTY;
if (isMain || hasPipeInput) {
    createPrettyLog(gracefulShutdown);
}
