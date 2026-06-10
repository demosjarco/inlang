---
"@inlang/plugin-i18next": patch
---

Fix `exportFiles` throwing `The variant does not have a context match` (or `The variant does not have a plural match`) for bundles that `importFiles` itself created from i18next context and plural sibling keys. Variants without a literal context/plural match — catchall variants and the base key fallback — now serialize back to their base key, so projects using context keys round-trip again. Fixes https://github.com/opral/inlang/issues/4355
