---
"@inlang/plugin-next-intl": minor
"@inlang/sdk": patch
---

Add new import/export API support with namespace path patterns while keeping legacy next-intl project settings and `{languageTag}` path patterns compatible.

Allow export files to override the configured path pattern via metadata so plugins can safely route individual files without mutating project settings.
