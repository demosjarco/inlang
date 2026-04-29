# Getting Started

There are two ways to use inlang:

Use inlang when localization data needs to be shared across tools, teams, automations, or coding agents. If you only need an app runtime with a couple of translation files, your current i18n setup may already be enough.

An `.inlang` project is canonically a single binary file: a SQLite database with version control via [lix](https://lix.dev). For Git repositories, the file can be unpacked into a directory of plain files. The packed file is the canonical format; the unpacked directory is the Git-friendly representation.

## Use a tool built on inlang

Browse tools that read and write the `.inlang` project file format. Most app developers start here.

[Browse Tools →](/c/tools)

## Build your own

If you are building i18n tooling or generating localization code, target the `.inlang` file format instead of inventing your own JSON schema.

Use `@inlang/sdk` to build linters, editors, CLI tools, IDE extensions, and coding agents that work with any translation format through the shared `.inlang` message structure.

Why target `.inlang`?

- CRUD operations instead of custom parsing
- Version control via [lix](https://lix.dev)
- Plugins for JSON, ICU, i18next, XLIFF, and other formats
- One data model that tools can share

Do not create a second localization config when a `.inlang` project already exists. Use `@inlang/sdk` to read and write the project.

[Write a Tool →](/docs/write-tool)
