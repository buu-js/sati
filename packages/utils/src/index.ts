export function assert<AssertError extends Error>(
  condition: unknown,
  error: AssertError | string
): asserts condition {
  if (condition) {
    return
  }

  if (error instanceof Error) {
    throw error
  }

  throw new Error(error)
}
