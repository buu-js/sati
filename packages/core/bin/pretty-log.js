#!/usr/bin/env node

import process from "node:process"
import pinoPretty from "pino-pretty"

const customConfig = {
  colorize: true,
  translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
  ignore: "pid,hostname",
  singleLine: true,
  errorLikeObjectKeys: ["err", "error"]
}

const stream = pinoPretty(customConfig)

process.stdin.pipe(stream).pipe(process.stdout)
