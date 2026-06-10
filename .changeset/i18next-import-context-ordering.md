---
"@inlang/plugin-i18next": patch
---

Import i18next context and plural sibling keys with explicit catchall matches on the base key variants, consistent selectors across the bundle, and most-specific-first variant ordering (`key_context_plural` > `key_context` > `key_plural` > `key`). First-match-wins consumers like the Paraglide compiler now resolve context the way i18next does instead of always returning the base variant. Fixes https://github.com/opral/inlang/issues/4354
