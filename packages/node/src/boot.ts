import { createBoot } from "@buujs/sati/boot"
import { logger } from "./logger"
import { gracefulShutdown } from "./shutdown"
import { scheduler } from "./scheduler"
import { serve as nodeServe } from "@hono/node-server"

export const boot = createBoot({
  logger,
  gracefulShutdown,
  scheduler,
  serve: (options, onListen) =>
    nodeServe(
      {
        fetch: options.fetch,
        hostname: options.hostname,
        port: options.port
      },
      (info) => {
        onListen(info)
      }
    )
})
