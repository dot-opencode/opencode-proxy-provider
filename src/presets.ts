import { existsSync } from "node:fs"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { applyEdits, modify, parse, type ParseError } from "jsonc-parser"
import shared from "../presets.json" with { type: "json" }

export const PRESETS = (shared as { presets: Record<string, Record<string, unknown>> }).presets

const FILES = ["oh-my-opencode-slim.jsonc", "oh-my-opencode-slim.json"]
type Env = Record<string, string | undefined>
const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v)

export function userConfigDir(env: Env = process.env): string {
  if (env.OPENCODE_CONFIG_DIR) return env.OPENCODE_CONFIG_DIR
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, "opencode")
  return join(homedir(), ".config", "opencode")
}

/** The user slim config; a new `oh-my-opencode-slim.json` when none exists. */
export function slimConfigPath(env: Env = process.env): string {
  const dir = userConfigDir(env)
  return FILES.map((f) => join(dir, f)).find((p) => existsSync(p)) ?? join(dir, FILES[1]!)
}

const canonical = (v: unknown): string =>
  JSON.stringify(v, (_, x) => (isObj(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x))

export type SyncResult = { path: string; updated: string[] }

/**
 * Writes the shared presets into the user's slim config, replacing presets with the same
 * name and leaving everything else (other presets, "preset", comments) untouched.
 * The file is rewritten only when something changed.
 */
export async function syncPresets(
  presets: Record<string, unknown> = PRESETS,
  env: Env = process.env,
): Promise<SyncResult> {
  const path = slimConfigPath(env)
  const original = existsSync(path) ? await readFile(path, "utf8") : "{}\n"
  const bom = original.startsWith("\uFEFF") ? "\uFEFF" : ""
  let body = bom ? original.slice(1) : original

  const errors: ParseError[] = []
  const data = parse(body, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length || !isObj(data)) throw new Error(`Cannot parse ${path}; leaving it unchanged`)
  const current = isObj(data.presets) ? data.presets : {}

  const updated = Object.keys(presets).filter((name) => canonical(current[name]) !== canonical(presets[name]))
  if (!updated.length) return { path, updated }

  const formattingOptions = { insertSpaces: true, tabSize: 2, eol: body.includes("\r\n") ? "\r\n" : "\n" }
  for (const name of updated) body = applyEdits(body, modify(body, ["presets", name], presets[name], { formattingOptions }))

  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(tmp, bom + body, "utf8")
    await rename(tmp, path)
  } catch (e) {
    await unlink(tmp).catch(() => {})
    throw e
  }
  return { path, updated }
}
