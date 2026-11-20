import type { Model, Provider } from "@opencode/plugin"
import catalog from "../providers.json" with { type: "json" }

/** One model entry in providers.json; everything except `name` falls back to OpenCode's defaults. */
export interface ModelEntry {
  name: string
  type?: string
  capabilities?: { tools: boolean; input: string[]; output: string[]; temperature?: boolean }
  limit?: { context: number; input?: number; output: number }
  variants?: { id: string; settings?: Record<string, unknown> }[]
  settings?: Record<string, unknown>
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

export interface ProviderEntry {
  name: string
  package: string
  settings?: Record<string, unknown>
  headers?: Record<string, string>
  models: Record<string, ModelEntry>
}

export interface Catalog {
  providers: Record<string, ProviderEntry>
}

export const CATALOG = catalog as Catalog

type Env = Record<string, string | undefined>

/** Replaces `{env:NAME}` in string values, recursively; unknown variables become "". */
export function resolveEnv<T>(value: T, env: Env): T {
  if (typeof value === "string") return value.replace(/\{env:([^}]+)\}/g, (_, name) => env[name] ?? "") as T
  if (Array.isArray(value)) return value.map((v) => resolveEnv(v, env)) as T
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveEnv(v, env)])) as T
  return value
}

export function toProviderInfo(id: string, entry: ProviderEntry, env: Env): Provider.Info {
  return {
    id,
    name: entry.name,
    activation: "enabled",
    package: entry.package,
    ...(entry.settings ? { settings: resolveEnv(entry.settings, env) } : {}),
    ...(entry.headers ? { headers: resolveEnv(entry.headers, env) } : {}),
  } as Provider.Info
}

export function toModelInfo(providerID: string, id: string, entry: ModelEntry): Model.Info {
  return {
    id,
    modelID: id,
    providerID,
    name: entry.name,
    ...(entry.type ? { type: entry.type } : {}),
    capabilities: entry.capabilities ?? { tools: true, input: ["text", "image"], output: ["text"] },
    variants: entry.variants ?? [],
    time: { released: 0 },
    cost: [],
    status: "active",
    enabled: true,
    limit: entry.limit ?? { context: 200_000, output: 32_000 },
    ...(entry.settings ? { settings: entry.settings } : {}),
    ...(entry.headers ? { headers: entry.headers } : {}),
    ...(entry.body ? { body: entry.body } : {}),
  } as unknown as Model.Info
}
