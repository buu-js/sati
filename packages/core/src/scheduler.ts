import { createLogger } from "./logger"

export type SchedulerConfig = {
  logger: ReturnType<typeof createLogger>
}

export interface Scheduler {
  register(
    { cronTime, name }: { cronTime: string; name: string },
    fn: () => void | Promise<void>
  ): void
  trigger(): void
  stop(): void
}

export type SchedulerFactory = ({ logger }: SchedulerConfig) => Scheduler
