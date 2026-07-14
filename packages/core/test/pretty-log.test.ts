import { describe, it, expect } from "vitest"
import { PassThrough } from "node:stream"
import { initPipeline } from "../bin/pretty-log.js"

describe("Pino Pretty Output Verification", () => {
  it("should process JSON logs into a readable format based on customConfig", async () => {
    const mockStdin = new PassThrough()
    const mockStdout = new PassThrough()

    initPipeline(mockStdin as any, mockStdout as any)

    const readOutput = new Promise((resolve) => {
      let actualOutput = ""
      mockStdout.on("data", (chunk) => {
        actualOutput += chunk.toString()
      })
      mockStdout.on("end", () => {
        resolve(actualOutput)
      })
    })

    const rawLog =
      JSON.stringify({
        level: 30,
        time: 1783949189313,
        pid: 18548,
        hostname: "MacBookAir",
        msg: "Pipeline test passed cleanly!"
      }) + "\n"

    mockStdin.write(rawLog)
    mockStdin.end()

    const actualOutput = await readOutput

    expect(actualOutput).toContain("INFO")
    expect(actualOutput).toContain("Pipeline test passed cleanly!")
    expect(actualOutput).not.toContain("18548")
    expect(actualOutput).not.toContain("MacBookAir")
  })
})
