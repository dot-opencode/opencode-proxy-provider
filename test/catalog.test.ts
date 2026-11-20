import { expect, test } from "bun:test"
import { CATALOG, resolveEnv, toModelInfo, toProviderInfo } from "../src/catalog.ts"

const providers = Object.entries(CATALOG.providers)

test("catalog has providers with models", () => {
  expect(providers.length).toBeGreaterThan(0)
  for (const [id, p] of providers) {
    expect(id).toMatch(/^[a-z0-9-]+$/)
    expect(p.name).toBeTruthy()
    expect(p.package).toBeTruthy()
    expect(Object.keys(p.models).length).toBeGreaterThan(0)
  }
})

test("every model entry is well-formed", () => {
  for (const [pid, p] of providers)
    for (const [mid, m] of Object.entries(p.models)) {
      const where = `${pid}/${mid}`
      expect(m.name, where).toBeTruthy()
      if (m.capabilities) {
        expect(typeof m.capabilities.tools, where).toBe("boolean")
        expect(m.capabilities.input.length, where).toBeGreaterThan(0)
        expect(m.capabilities.output.length, where).toBeGreaterThan(0)
      }
      if (m.limit) {
        expect(Number.isInteger(m.limit.context) && m.limit.context > 0, where).toBe(true)
        expect(Number.isInteger(m.limit.output) && m.limit.output > 0, where).toBe(true)
        if (m.limit.input !== undefined) expect(m.limit.input <= m.limit.context, where).toBe(true)
      }
      if (m.variants) {
        const ids = m.variants.map((v) => v.id)
        expect(new Set(ids).size, `${where} duplicate variants`).toBe(ids.length)
      }
      if (m.type === "image") expect(m.capabilities?.output, where).toContain("image")
    }
})

test("no secrets in the catalog", () => {
  const text = JSON.stringify(CATALOG)
  expect(text).not.toMatch(/sk-[A-Za-z0-9]{10,}/)
})

test("resolveEnv substitutes nested values", () => {
  expect(resolveEnv({ a: "{env:X}/v1", b: ["{env:Y}"], c: 1 }, { X: "u", Y: "k" })).toEqual({ a: "u/v1", b: ["k"], c: 1 })
  expect(resolveEnv("{env:MISSING}", {})).toBe("")
})

test("conversion fills required fields", () => {
  const [pid, p] = providers[0]!
  const info = toProviderInfo(pid, p, { CPA_API_KEY: "k", CPA_BASE_URL: "http://x" })
  expect(info.activation).toBe("enabled")
  expect(JSON.stringify(info)).not.toContain("{env:")
  const m = toModelInfo("p", "m", { name: "M" })
  expect(m.limit.context).toBeGreaterThan(0)
  expect(m.capabilities.tools).toBe(true)
  expect(m.variants).toEqual([])
})
