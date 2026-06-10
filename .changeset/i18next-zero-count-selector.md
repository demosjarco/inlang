---
"@inlang/plugin-i18next": patch
---

Import `_zero` keys with i18next's actual semantics: an exact `count = 0` match (via a `count` selector ahead of the plural category) plus the Intl "zero" category fallback. Previously `_zero` was modeled only as the Intl plural category, which most languages never select — so the zero translation was dead code at `count = 0` in e.g. English and French. Fixes https://github.com/opral/inlang/issues/4357
