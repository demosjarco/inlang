# Writing a Tool

This guide walks through building a tool that flags missing translations. By the end, you'll understand how to load a project and query messages with the CRUD API.

## What tools can do

Tools read and write translations through the `.inlang` project file format via the CRUD API. Because plugins handle conversion at the boundary, your tool works with any translation format — JSON, XLIFF, i18next, etc. — without parsing each one directly.

An `.inlang` project is canonically a single binary file. In Git repositories, it is often unpacked into a directory; `loadProjectFromDirectory()` loads that Git-friendly representation.

If a `project.inlang/` directory already exists, load it with `loadProjectFromDirectory()`. If your tool is generating a new localization project from scratch, start with `newProject()` and save the packed file with `project.toBlob()`; see [Getting Started](/docs/getting-started) for a runnable create-save-reload example.

```
┌─────────────────┐
│    Your Tool    │
├─────────────────┤
│    CRUD API     │  ◄── Query and modify messages
├─────────────────┤
│  .inlang file   │
├─────────────────┤
│    Plugins      │  ◄── Handle file formats
└─────────────────┘
```

## Step 1: Load the project

```typescript
import { loadProjectFromDirectory } from "@inlang/sdk";
import fs from "node:fs";

const project = await loadProjectFromDirectory({
  path: "./project.inlang",
  fs,
});
```

That's it. The project is loaded with all translations from your files (via plugins). The external files are compatibility files; the tool works against the shared `.inlang` data model.

## Step 2: Get project settings

```typescript
const settings = await project.settings.get();

console.log("Base locale:", settings.baseLocale);
console.log("Locales:", settings.locales);
// Base locale: en
// Locales: ["en", "de", "fr"]
```

## Step 3: Query all bundles

```typescript
const bundles = await project.db.selectFrom("bundle").selectAll().execute();

console.log(`Found ${bundles.length} translation keys`);
```

## Step 4: Find missing translations

Now let's find bundles that are missing translations for certain locales:

```typescript
async function findMissingTranslations(project) {
  const settings = await project.settings.get();
  const bundles = await project.db.selectFrom("bundle").selectAll().execute();
  const messages = await project.db.selectFrom("message").selectAll().execute();

  const missing = [];

  for (const bundle of bundles) {
    // Get all messages for this bundle
    const bundleMessages = messages.filter((m) => m.bundleId === bundle.id);
    const localesWithTranslation = bundleMessages.map((m) => m.locale);

    // Find which locales are missing
    for (const locale of settings.locales) {
      if (!localesWithTranslation.includes(locale)) {
        missing.push({
          bundleId: bundle.id,
          locale,
        });
      }
    }
  }

  return missing;
}
```

## Step 5: Put it together

Here's a complete CLI tool:

```typescript
import { loadProjectFromDirectory } from "@inlang/sdk";
import fs from "node:fs";

async function main() {
  // Load project
  const project = await loadProjectFromDirectory({
    path: "./project.inlang",
    fs,
  });

  const settings = await project.settings.get();
  const bundles = await project.db.selectFrom("bundle").selectAll().execute();
  const messages = await project.db.selectFrom("message").selectAll().execute();

  // Find missing translations
  const missing = [];

  for (const bundle of bundles) {
    const bundleMessages = messages.filter((m) => m.bundleId === bundle.id);
    const localesWithTranslation = bundleMessages.map((m) => m.locale);

    for (const locale of settings.locales) {
      if (!localesWithTranslation.includes(locale)) {
        missing.push({ bundleId: bundle.id, locale });
      }
    }
  }

  // Report results
  if (missing.length === 0) {
    console.log("All translations complete!");
  } else {
    console.log(`Found ${missing.length} missing translations:\n`);
    for (const { bundleId, locale } of missing) {
      console.log(`  - "${bundleId}" is missing locale "${locale}"`);
    }
    process.exit(1);
  }
}

main();
```

Run it:

```bash
$ npx tsx check-translations.ts

Found 3 missing translations:

  - "greeting" is missing locale "fr"
  - "error_404" is missing locale "de"
  - "error_404" is missing locale "fr"
```

## Using SQL for complex queries

The CRUD API is powered by Kysely. You can write complex queries:

```typescript
// Find bundles missing a specific locale
const missingGerman = await project.db
  .selectFrom("bundle")
  .where((eb) =>
    eb.not(
      eb.exists(
        eb
          .selectFrom("message")
          .where("message.bundleId", "=", eb.ref("bundle.id"))
          .where("message.locale", "=", "de"),
      ),
    ),
  )
  .selectAll()
  .execute();

// Count translations per locale
const counts = await project.db
  .selectFrom("message")
  .select("locale")
  .select((eb) => eb.fn.count("id").as("count"))
  .groupBy("locale")
  .execute();
```

## Modifying translations

Tools can also create, update, and delete translations:

```typescript
// Add a missing translation
await project.db
  .insertInto("message")
  .values({
    id: crypto.randomUUID(),
    bundleId: "greeting",
    locale: "fr",
    selectors: [],
  })
  .execute();

// Add the variant with text
await project.db
  .insertInto("variant")
  .values({
    id: crypto.randomUUID(),
    messageId: messageId,
    matches: [],
    pattern: [{ type: "text", value: "Bonjour!" }],
  })
  .execute();
```

## Saving changes

If you're using the unpacked format, changes sync automatically when `syncInterval` is enabled. To explicitly save:

```typescript
import { saveProjectToDirectory } from "@inlang/sdk";
import fs from "node:fs/promises";

await saveProjectToDirectory({
  fs,
  project,
  path: "./project.inlang",
});
```

`saveProjectToDirectory()` writes translation resource files through import/export plugins. If no exporter plugin is configured, save the canonical packed file instead:

```typescript
import fs from "node:fs/promises";

const blob = await project.toBlob();
await fs.writeFile("project.inlang", new Uint8Array(await blob.arrayBuffer()));
```

## Next steps

- [CRUD API](/docs/crud-api) — Full reference for query operations
- [Data Model](/docs/data-model) — Understand bundles, messages, and variants
- [Unpacked Project](/docs/unpacked-project) — Loading projects from git repos
- [Architecture](/docs/architecture) — See how tools fit in
