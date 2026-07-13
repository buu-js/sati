import { SchedulerFactory, Scheduler } from "@buujs/sati/scheduler"
import { gracefulShutdown } from "@buujs/sati/shutdown"
import { Cron } from "croner"
import { assert } from "@buujs/sati-utils"

export const createScheduler: SchedulerFactory = ({ logger }) => {
  function createTask(): Scheduler {
    let job: Cron | null = null

    gracefulShutdown(async () => {
      const currentJob = job as Cron | null
      if (currentJob) {
        currentJob.stop()
        logger.info(`Schedule unregistered`)
      }
    })

    return {
      register({ name, cronTime }, fn) {
        assert(!!cronTime, "Missing Cron Time configuration")

        if (job) {
          job.stop()
          logger.warn("Previous schedule stopped due to re-registration")
        }

        job = new Cron(
          cronTime,
          async () => {
            try {
              await fn()
            } catch (error) {
              logger.error(error)
            }
          },
          {
            name
          }
        )
        logger.info(`Schedule registered <${cronTime!}>`)
        return this
      },
      trigger() {
        assert(!!job, "Failed to trigger task; register must be called first")
        job.trigger()
        logger.info("Task triggered manually")
      },
      stop() {
        assert(!!job, "Failed to stop task; register must be called first")
        job.stop()
        logger.info("Task stopped")
      }
    }
  }
  return createTask()
}
