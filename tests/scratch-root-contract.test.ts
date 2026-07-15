import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, test } from "bun:test"

async function markdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(root, entry.name)
      if (entry.isDirectory()) return markdownFiles(absolute)
      return entry.isFile() && entry.name.endsWith(".md") ? [absolute] : []
    }),
  )
  return nested.flat()
}

describe("owner-scoped scratch root contract", () => {
  test("skill instructions never use the legacy shared scratch root", async () => {
    const files = await markdownFiles(path.join(process.cwd(), "skills"))
    const offenders: string[] = []

    for (const file of files) {
      const content = await readFile(file, "utf8")
      if (content.includes("/tmp/compound-engineering/")) {
        offenders.push(path.relative(process.cwd(), file))
      }
    }

    expect(offenders).toEqual([])
  })

  test("run-producing skills resolve a UID-scoped or overridden root", async () => {
    const runProducingSkills = [
      "ce-brainstorm",
      "ce-code-review",
      "ce-compound",
      "ce-explain",
      "ce-ideate",
      "ce-pov",
      "ce-sweep",
    ]

    for (const skill of runProducingSkills) {
      const content = await readFile(
        path.join(process.cwd(), "skills", skill, "SKILL.md"),
        "utf8",
      )
      expect(content).toContain("COMPOUND_ENGINEERING_SCRATCH_ROOT")
      expect(content).toContain("/tmp/compound-engineering-$(id -u)")
    }
  })
})
