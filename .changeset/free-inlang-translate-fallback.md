---
"@inlang/cli": minor
---

Add a free hosted translation service as the default fallback for `machine translate`.

When `INLANG_MACHINE_TRANSLATE_PROVIDER` is unset and neither `INLANG_GOOGLE_TRANSLATE_API_KEY` nor `INLANG_DEEPL_API_KEY` is set, the CLI now falls back to the free hosted service at translate.demosjarco.dev instead of failing. It prints a notice that stability is not guaranteed and that providing your own API key is recommended. Select it explicitly with `INLANG_MACHINE_TRANSLATE_PROVIDER=inlang`, and optionally pin a model with `INLANG_TRANSLATE_MODEL`. If the service is unreachable, the CLI explains how to configure your own provider instead.

See the updated BYOK guide for details.
