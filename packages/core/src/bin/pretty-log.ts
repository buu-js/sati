#!/usr/bin/env node

import process from "node:process"

const defaultArgs = [
  "--colorize",
  "--translateTime",
  "SYS:yyyy-mm-dd HH:MM:ss",
  "--ignore",
  "hostname",
  "--singleLine",
  "--errorLikeObjectKeys",
  "err,error"
]

defaultArgs.forEach((arg, index) => {
  if (!arg.startsWith("-")) return

  const hasFlag =
    process.argv.includes(arg) || process.argv.includes(arg.replace("--", "-"))
  if (!hasFlag) {
    if (defaultArgs[index + 1] && !defaultArgs[index + 1].startsWith("-")) {
      process.argv.push(arg, defaultArgs[index + 1])
    } else {
      process.argv.push(arg)
    }
  }
})

if (!process.stdin.isTTY) {
  process.once("SIGINT", () => {})
}

//@ts-ignore
import("pino-pretty/bin.js")
