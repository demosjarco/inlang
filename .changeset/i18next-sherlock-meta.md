---
"@inlang/plugin-i18next": patch
---

Restore Sherlock (inlang.vs-code-extension) inline annotations, hovers, and extraction for i18next projects. The plugin shipped a static `meta["app.inlang.ideExtension"]` whose matchers require per-call settings; Sherlock skips its settings-injecting `addCustomApi` migration when `meta` is already set and invokes matchers without settings, so every match silently returned empty. Removing the static `meta` lets Sherlock's migration bake the plugin settings into the matchers, including namespace inference from `useTranslation('ns')`. Fixes https://github.com/opral/inlang/issues/4368
