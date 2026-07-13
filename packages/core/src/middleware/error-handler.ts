import { Context } from "hono"
import { HTTPException } from "hono/http-exception"

const IGNORE_STACK_STATUS = [401, 403, 404]

export function errorHandler(error: Error, c: Context) {
  const status = error instanceof HTTPException ? error.status : 500

  const logger = c.var?.logger
  if (logger) {
    const shouldLogStack = !IGNORE_STACK_STATUS.includes(status)
    logger.error(error, shouldLogStack)
  } else {
    console.error(`[Error ${status}]:`, error.message)
  }

  const isDev =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"

  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
        ...(error.cause && isDev ? { cause: error.cause } : {})
      },
      error.status
    )
  }

  return c.json(
    {
      message: isDev ? error.message : "Internal Server Error",
      ...(isDev ? { stack: error.stack } : {})
    },
    500
  )
}
