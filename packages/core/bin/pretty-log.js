#!/usr/bin/env node
import process from 'node:process';
import pinoPretty from 'pino-pretty';

const isMain = process.argv[1] === import.meta.filename;
const hasPipeInput = !process.stdin.isTTY;
const customConfig = {
    colorize: true,
    translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
    ignore: "pid,hostname",
    singleLine: true,
    errorLikeObjectKeys: [
        "err",
        "error"
    ]
};
function initPipeline(input = process.stdin, output = process.stdout) {
    const prettyStream = pinoPretty({
        ...customConfig,
        destination: output
    });
    input.pipe(prettyStream);
}
if (isMain || hasPipeInput) {
    initPipeline();
}

export { customConfig, initPipeline };
