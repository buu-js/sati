#!/usr/bin/env node

import process from "node:process"
import pinoPretty from "pino-pretty"

export const customConfig = {
  colorize: true,
  translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
  ignore: "pid,hostname",
  singleLine: true,
  errorLikeObjectKeys: ["err", "error"]
}

export function initPipeline(input = process.stdin, output = process.stdout) {
  const prettyStream = pinoPretty({ ...customConfig, destination: output })

  input.pipe(prettyStream)
}

if (process.argv[1] === import.meta.filename) {
  initPipeline()
}
