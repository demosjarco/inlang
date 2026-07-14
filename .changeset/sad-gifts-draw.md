---
"@inlang/cli": minor
---

Add DeepL API support for `machine translate`.

Set `INLANG_MACHINE_TRANSLATE_PROVIDER=deepl` and `INLANG_DEEPL_API_KEY` to translate with your own DeepL API key. Google Translate remains the default provider when `INLANG_MACHINE_TRANSLATE_PROVIDER` is unset. Free DeepL keys ending in `:fx` automatically use the `api-free.deepl.com` endpoint.

See the updated BYOK guide for setup instructions for both Google and DeepL.
