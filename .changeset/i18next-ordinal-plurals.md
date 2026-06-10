---
"@inlang/plugin-i18next": patch
---

Parse i18next ordinal plural keys (`key_ordinal_one`, including context combinations like `key_male_ordinal_one`) as a dedicated `countOrdinal` selector backed by `Intl.PluralRules` with `{ type: "ordinal" }`, instead of misparsing them as context `"ordinal"` with cardinal categories. Compiled messages now produce "1st/2nd/3rd/4th" correctly from a plain `count` input, and context+ordinal keys — which previously lost their context and ordinal marker on export — round-trip unchanged. Fixes https://github.com/opral/inlang/issues/4358
