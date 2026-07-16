import process from "node:process"
import pinoPretty from "pino-pretty"
import { GracefulShutdown } from "./shutdown"

export const customConfig = {
  colorize: true,
  translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
  ignore: "pid,hostname",
  singleLine: true,
  errorLikeObjectKeys: ["err", "error"]
}

export function createPrettyLog(
  gracefulShutdown: GracefulShutdown,
  input = process.stdin,
  output = process.stdout
) {
  const prettyStream = pinoPretty({ ...customConfig, destination: output })

  input.pipe(prettyStream, { end: false })
  input.on("end", () => {
    prettyStream.end()
  })

  gracefulShutdown(() => {
    //@ts-ignore
    prettyStream.flush?.()
  })
}
