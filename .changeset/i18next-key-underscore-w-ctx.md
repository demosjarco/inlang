---
"@inlang/plugin-i18next": minor
---

Preserve underscored i18next keys and classify contexts consistently across locales.
Add `contextValues` to resolve ambiguous context suffixes, including single-context
resources and values containing underscores. Mixed cardinal/ordinal MF2 bundles
use a `pluralType` input to preserve lookup behavior; ordinal zero no longer
overwrites cardinal zero on export.
