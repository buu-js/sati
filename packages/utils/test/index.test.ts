import { describe, it, expect } from "vitest" // or jest
import { assert } from "../src"

describe("util: assert", () => {
  it("should not throw an error if the condition is true", () => {
    expect(() => assert(true, "This will not throw")).not.toThrow()
    expect(() => assert("hello", "Non-empty string is truthy")).not.toThrow()
  })

  it("should throw an Error with the correct message if the condition is false", () => {
    const errorMessage = "Condition must be met!"

    expect(() => assert(false, errorMessage)).toThrow(Error)
    expect(() => assert(false, errorMessage)).toThrow(errorMessage)
  })

  it('should throw an error on other falsy values (null, undefined, 0, "")', () => {
    expect(() => assert(null, "Null error")).toThrow("Null error")
    expect(() => assert(undefined, "Undefined error")).toThrow("Undefined error")
    expect(() => assert(0, "Zero error")).toThrow("Zero error")
    expect(() => assert("", "Empty string error")).toThrow("Empty string error")
  })
})
