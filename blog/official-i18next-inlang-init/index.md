---
og:title: "i18next Officially Supports Initializing inlang Projects"
og:description: "The official i18next CLI can now optionally scaffold an inlang project so Sherlock, Fink, and Paraglide work with existing i18next JSON files."
og:type: article
---

# i18next officially supports initializing inlang projects

The i18next maintainers added official inlang project initialization to the i18next CLI in [`i18next/i18next-cli#268`](https://github.com/i18next/i18next-cli/pull/268).

i18next users can add Sherlock, Fink, and Paraglide without migrating translations or changing file formats.

Your i18next JSON files stay the source of truth.

## What changed

When run in an i18next project using JSON resource files, [`i18next-cli init --inlang`](https://github.com/i18next/i18next-cli/pull/268) creates `project.inlang/settings.json`.

The scaffold reads the existing i18next config and points `@inlang/plugin-i18next@6.2.0` at the repo's translation files.

For projects using a layout like this:

```txt
locales/
  en/
    common.json
    checkout.json
  de/
    common.json
    checkout.json
```

the generated inlang project points to the same files. No conversion. No copied messages.

The scaffold also adds the Sherlock VS Code extension to `.vscode/extensions.json` recommendations.

## Why this matters

Previously, users had to configure inlang manually. Now the i18next CLI reuses the translation layout it already knows.

## What this enables

The generated project works with:

- [Sherlock](https://inlang.com/m/r7kp499g/app-inlang-ideExtension) to manage translations in VS Code
- [Fink](https://inlang.com/m/tdozzpar/app-inlang-finkLocalizationEditor) to edit translations in a web UI
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) to compile messages

## Interop fixes

Adriano, maintainer of i18next, tested the path from an existing i18next project to a working inlang setup end-to-end. The test uncovered edge cases in `@inlang/plugin-i18next`, the inlang SDK, and Paraglide JS. Fixes shipped in:

- `@inlang/plugin-i18next` 6.2.0
- `@inlang/sdk` 2.10.0
- `@inlang/paraglide-js` 2.19.0

## Get started

In an existing i18next project, run:

```sh
i18next-cli init --inlang
```

The generated `project.inlang/settings.json` lets inlang tooling work with the same translation files your i18next app already uses.
