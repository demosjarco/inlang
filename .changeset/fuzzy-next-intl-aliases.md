---
"@inlang/plugin-next-intl": minor
---

Improve Sherlock message reference matching for next-intl translator aliases and quoted object namespace assignments.

The matcher now resolves simple aliases like `const translate = t`, chained aliases, renamed destructured translation functions, and direct `getTranslations({ namespace })` assignments with single- or double-quoted namespace values.
