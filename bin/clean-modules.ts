import { readdir, rm } from "node:fs/promises"
import { join } from "node:path"

async function deleteNodeModules(dirPath: string): Promise<void> {
  const targetDir = join(dirPath, "node_modules")

  try {
    console.log(`💥 Cleaning ${targetDir}...`)

    await rm(targetDir, {
      recursive: true,
      force: true
    })
  } catch (err) {
    console.error(`❌ Failed to remove ${targetDir}:`, (err as Error).message)
  }
}

async function getDirectories(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(path, entry.name))
  } catch {
    return []
  }
}

async function scanAndClean(): Promise<void> {
  await deleteNodeModules(".")

  // packages/*
  const packages = await getDirectories("packages")

  for (const pkg of packages) {
    await deleteNodeModules(pkg)

    // packages/*/*
    for (const nested of await getDirectories(pkg)) {
      await deleteNodeModules(nested)
    }
  }

  console.log("\n✨ Done! All target node_modules have been cleaned.")
}

void scanAndClean()
