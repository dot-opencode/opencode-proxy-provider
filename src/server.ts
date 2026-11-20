import { Plugin } from "@opencode/plugin"
import { CATALOG, toModelInfo, toProviderInfo } from "./catalog.ts"

/**
 * Registers the CLIProxyAPI providers and models from providers.json.
 * A provider the user already declares in opencode.json keeps its own settings;
 * only its model list is replaced by the catalog.
 */
export default Plugin.define({
  id: "proxy-provider",
  setup: async (context) => {
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
