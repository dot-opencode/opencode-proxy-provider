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

1. Edit `providers.json`. Each provider uses the same shape as `providers` in `opencode.json`: `name`, `package`, `settings`, and `models`. In a model entry only `name` is required. Missing `capabilities`, `limit` and `variants` fall back to OpenCode defaults.
2. Run `bun test` to validate the catalog.
3. Bump `version` in `package.json`, then commit and push a `vX.Y.Z` tag. CI publishes it to the `release` branch.
4. Everyone else runs `opencode plugin update`.

## Development

```
bun install
bun run typecheck
bun test
```
