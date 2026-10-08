---
"@inlang/sdk": minor
"@inlang/cli": minor
"@inlang/editor-component": minor
"@inlang/plugin-android": minor
"@inlang/plugin-apple-strings": minor
"@inlang/plugin-apple-xcstrings": minor
"@inlang/plugin-i18next": minor
"@inlang/plugin-icu1": minor
"@inlang/plugin-message-format": minor
"@inlang/plugin-json": minor
"@inlang/plugin-next-intl": minor
---

Use the canonical Lix SQL names in `project.db`.

The SDK no longer rewrites table and column names before queries reach Lix. The Kysely schema now declares the tables and columns exactly as Lix exposes them, so the SQL you write is the SQL that runs.

| Before                  | After                                |
| ----------------------- | ------------------------------------ |
| `selectFrom("bundle")`  | `selectFrom("inlang_bundle")`        |
| `selectFrom("message")` | `selectFrom("inlang_message")`       |
| `selectFrom("variant")` | `selectFrom("inlang_variant")`       |
| `message.bundleId`      | `message.bundle_id`                  |
| `variant.messageId`     | `variant.message_id`                 |
| `"bundle.id"`           | `"inlang_bundle.id"`                 |

The `Message`, `Variant`, `MessageImport` and `VariantImport` types follow the same column names, so plugins return `bundle_id` and `message_id` from `importFiles()`. `messageBundleId` and `messageLocale` on `VariantImport` are unchanged because they are import matching keys, not columns.

`selectBundleNested(db).where("inlang_bundle.id", "=", id)` replaces `.where("bundle.id", "=", id)`.
