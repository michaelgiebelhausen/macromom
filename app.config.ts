import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json is the static base; this file is the extension point for anything
// dynamic (per-environment names, injected build metadata, plugin config).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'MacroMom',
  slug: config.slug ?? 'macromom',
});
