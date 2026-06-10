---
"@inlang/sdk": minor
"@inlang/plugin-i18next": minor
---

fix `saveProjectToDirectory` throwing `pathPattern.replace is not a function` when a plugin's `pathPattern` is a namespace object (https://github.com/opral/inlang/issues/4356)

- `ExportFile` has a new optional `metadata` field — the counterpart of `ImportFile.toBeImportedFilesMetadata`. Plugins can use it to pass information to the writer, e.g. the namespace an exported file belongs to.
- `saveProjectToDirectory` resolves namespaced `pathPattern` objects (`Record<namespace, pattern>`) via `ExportFile.metadata.namespace` and writes each exported file to the path its namespace pattern describes. Files without a resolvable namespace fall back to being written by `file.name` instead of throwing.
- `@inlang/plugin-i18next` now provides `metadata: { namespace }` for namespaced export files. Saving a multi-namespace i18next project requires this plugin version (older plugin versions no longer crash but fall back to writing `{namespace}-{locale}.json` files relative to the project directory).
