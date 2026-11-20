import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parse } from "jsonc-parser"
import { CATALOG } from "../src/catalog.ts"
import { PRESETS, syncPresets } from "../src/presets.ts"

let dir: string, env: Record<string, string>
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "pp-"))
  env = { OPENCODE_CONFIG_DIR: dir }
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const SHARED = { a: { orchestrator: { model: "cpa-gui/x" } } }

test("every preset model exists in the catalog", () => {
  expect(Object.keys(PRESETS).length).toBeGreaterThan(0)
  const known = new Set(
    Object.entries(CATALOG.providers).flatMap(([pid, p]) => Object.keys(p.models).map((m) => `${pid}/${m}`)),
  )
  for (const [preset, agents] of Object.entries(PRESETS))
    for (const [agent, cfg] of Object.entries(agents as Record<string, any>)) {
      const models = [cfg.model].flat().filter(Boolean).map((m: any) => (typeof m === "string" ? m : m.id))
      for (const m of models) expect(known.has(m), `${preset}.${agent}: ${m}`).toBe(true)
    }
})

test("creates the slim config when missing", async () => {
  const r = await syncPresets(SHARED, env)
  expect(r.updated).toEqual(["a"])
  expect(JSON.parse(await readFile(join(dir, "oh-my-opencode-slim.json"), "utf8"))).toEqual({ presets: SHARED })
})

test("replaces shared presets, keeps others, comments and selection", async () => {
  const path = join(dir, "oh-my-opencode-slim.jsonc")
  await writeFile(
    path,
    `// my config\n{\n  "preset": "mine", // selected\n  "presets": {\n    "a": { "orchestrator": { "model": "old" } },\n    "mine": { "fixer": { "model": "m" } },\n  },\n  "fallback": { "enabled": true },\n}\n`,
  )
  const r = await syncPresets(SHARED, env)
  expect(r).toEqual({ path, updated: ["a"] })
  const text = await readFile(path, "utf8")
  expect(text).toContain("// my config")
  expect(text).toContain("// selected")
  const data = parse(text)
  expect(data.preset).toBe("mine")
  expect(data.presets.a).toEqual(SHARED.a)
  expect(data.presets.mine).toEqual({ fixer: { model: "m" } })
  expect(data.fallback).toEqual({ enabled: true })
})

test("does not rewrite an up-to-date file", async () => {
  const path = join(dir, "oh-my-opencode-slim.json")
  await writeFile(path, JSON.stringify({ presets: { a: { orchestrator: { model: "cpa-gui/x" } } } }))
  const before = (await stat(path)).mtimeMs
  const r = await syncPresets(SHARED, env)
  expect(r.updated).toEqual([])
  expect((await stat(path)).mtimeMs).toBe(before)
})

test("leaves a broken file untouched", async () => {
  const path = join(dir, "oh-my-opencode-slim.json")
  await writeFile(path, "{ broken")
  await expect(syncPresets(SHARED, env)).rejects.toThrow("Cannot parse")
  expect(await readFile(path, "utf8")).toBe("{ broken")
})
