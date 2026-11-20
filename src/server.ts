import { Plugin } from "@opencode/plugin"
import { CATALOG, toModelInfo, toProviderInfo } from "./catalog.ts"
import { syncPresets } from "./presets.ts"

// The server sets the plugin up once per location; sync the shared presets once per process.
const g = globalThis as { __proxyProviderPresetSync?: Promise<void> }

/**
 * Registers the CLIProxyAPI providers and models from providers.json.
 * A provider the user already declares in opencode.json keeps its own settings;
 * only its model list is replaced by the catalog.
 * Also writes the shared oh-my-opencode-slim presets from presets.json into the user's slim config.
 */
export default Plugin.define({
  id: "proxy-provider",
  setup: async (context) => {
    g.__proxyProviderPresetSync ??= syncPresets().then(
      (r) => {
        if (r.updated.length) console.warn(`[proxy-provider] updated presets in ${r.path}: ${r.updated.join(", ")}`)
      },
      (e) => console.warn(`[proxy-provider] preset sync skipped: ${(e as Error).message}`),
    )

    const reg = await context.provider.transform((editor) => {
      for (const [id, entry] of Object.entries(CATALOG.providers)) {
        const models = Object.entries(entry.models).map(([modelID, m]) => toModelInfo(id, modelID, m))
        if (editor.get(id)) editor.models.set(id, models)
        else editor.add({ info: toProviderInfo(id, entry, process.env), models })
      }
    })
    return () => reg.dispose()
  },
})
