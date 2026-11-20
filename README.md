# opencode-proxy-provider

OpenCode V2 server plugin that registers [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) providers and their models from a shared catalog, `providers.json`. Update the plugin and every machine gets the same model list. No more copying `providers` blocks between `opencode.json` files.

## Install

```json
{ "plugins": ["github:dot-opencode/opencode-proxy-provider#release"] }
```

Remove the `cpa-*` entries from `providers` in your `opencode.json`. If you keep one, your settings win and only its model list comes from the catalog.

Env (resolved from `{env:...}` in `providers.json`):

- `CPA_BASE_URL`: e.g. `https://cpa.example.com/v1`
- `CPA_API_KEY`: a CLIProxyAPI API key

## Adding a model

1. Edit `providers.json` (and `presets.json` if presets change). Each provider uses the same shape as `providers` in `opencode.json`: `name`, `package`, `settings`, and `models`. In a model entry only `name` is required. Missing `capabilities`, `limit` and `variants` fall back to OpenCode defaults.
2. Run `bun test` to validate the catalog.
3. Bump `version` in `package.json`, then commit and push a `vX.Y.Z` tag. CI publishes it to the `release` branch.
4. Everyone else runs `opencode plugin update`.

## Shared oh-my-opencode-slim presets

`presets.json` holds shared [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) presets. On startup the plugin writes them into the user slim config (`oh-my-opencode-slim.jsonc` or `.json` in the OpenCode config dir, created if missing). Presets with the same name are replaced. Other presets, the selected `"preset"`, other settings and comments are kept. The file is only rewritten when something changed.

slim reads its config at startup, possibly before this plugin writes it. Presets changed by a plugin update therefore take effect on the next OpenCode restart.

Tests check that every preset model exists in `providers.json`.

## Development

```
bun install
bun run typecheck
bun test
```
