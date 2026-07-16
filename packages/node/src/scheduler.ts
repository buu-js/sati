import { createScheduler } from "@buujs/sati-croner"
import { logger } from "./logger"
import { gracefulShutdown } from "./shutdown"

export const scheduler = createScheduler({ logger, gracefulShutdown })
