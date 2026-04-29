# Message Shapes

This page shows the concrete JSON shapes used by bundles, messages, variants, declarations, selectors, matches, and patterns.

Use these shapes when inserting data through `project.db`, `insertBundleNested()`, or a plugin's `importFiles()` return value.

## Minimal Message

```typescript
const messageId = crypto.randomUUID();
const variantId = crypto.randomUUID();

await insertBundleNested(project.db, {
  id: "greeting",
  declarations: [],
  messages: [
    {
      id: messageId,
      bundleId: "greeting",
      locale: "en",
      selectors: [],
      variants: [
        {
          id: variantId,
          messageId,
          matches: [],
          pattern: [{ type: "text", value: "Hello world!" }],
        },
      ],
    },
  ],
});
```

## Pattern

A `pattern` is an array. It can mix text, expressions, and markup.

### Text

```typescript
[{ type: "text", value: "Hello world!" }];
```

### Interpolation

Use an `input-variable` declaration for variables provided by the caller, then reference it with an expression.

```typescript
const messageId = crypto.randomUUID();
const variantId = crypto.randomUUID();

{
  id: "greeting",
  declarations: [{ type: "input-variable", name: "name" }],
  messages: [
    {
      id: messageId,
      bundleId: "greeting",
      locale: "en",
      selectors: [],
      variants: [
        {
          id: variantId,
          messageId,
          matches: [],
          pattern: [
            { type: "text", value: "Hello " },
            {
              type: "expression",
              arg: { type: "variable-reference", name: "name" },
            },
            { type: "text", value: "!" },
          ],
        },
      ],
    },
  ],
}
```

### Expression With Annotation

Annotations describe formatting functions. Plugins decide which annotations they can import or export.

```typescript
{
  type: "expression",
  arg: { type: "variable-reference", name: "count" },
  annotation: {
    type: "function-reference",
    name: "number",
    options: [],
  },
}
```

Options can use literals or variable references:

```typescript
{
  type: "function-reference",
  name: "number",
  options: [
    {
      name: "style",
      value: { type: "literal", value: "currency" },
    },
    {
      name: "currency",
      value: { type: "variable-reference", name: "currency" },
    },
  ],
}
```

### Markup

Markup is represented as pattern parts. This example corresponds to `Click <link>here</link><icon/>`.

```typescript
[
  { type: "text", value: "Click " },
  { type: "markup-start", name: "link" },
  { type: "text", value: "here" },
  { type: "markup-end", name: "link" },
  { type: "markup-standalone", name: "icon" },
];
```

Markup can include options and attributes:

```typescript
{
  type: "markup-start",
  name: "link",
  options: [
    {
      name: "href",
      value: { type: "literal", value: "/pricing" },
    },
  ],
  attributes: [
    {
      name: "external",
      value: true,
    },
  ],
}
```

## Selectors And Matches

Selectors choose which variables a message uses to pick a variant. Matches on each variant must refer to selector names.

### Literal Match

```typescript
{
  type: "literal-match",
  key: "platform",
  value: "ios",
}
```

### Catch-All Match

```typescript
{
  type: "catchall-match",
  key: "platform",
}
```

## Plural-Style Selector

Use an input variable for the caller-provided value, a local variable for the derived selector value, and variants that match the local variable.

```typescript
const messageId = crypto.randomUUID();
const oneVariantId = crypto.randomUUID();
const otherVariantId = crypto.randomUUID();

{
  id: "items_count",
  declarations: [
    { type: "input-variable", name: "count" },
    {
      type: "local-variable",
      name: "countPlural",
      value: {
        type: "expression",
        arg: { type: "variable-reference", name: "count" },
        annotation: {
          type: "function-reference",
          name: "plural",
          options: [],
        },
      },
    },
  ],
  messages: [
    {
      id: messageId,
      bundleId: "items_count",
      locale: "en",
      selectors: [{ type: "variable-reference", name: "countPlural" }],
      variants: [
        {
          id: oneVariantId,
          messageId,
          matches: [{ type: "literal-match", key: "countPlural", value: "one" }],
          pattern: [{ type: "text", value: "One item" }],
        },
        {
          id: otherVariantId,
          messageId,
          matches: [
            { type: "literal-match", key: "countPlural", value: "other" },
          ],
          pattern: [
            {
              type: "expression",
              arg: { type: "variable-reference", name: "count" },
            },
            { type: "text", value: " items" },
          ],
        },
      ],
    },
  ],
}
```

## CRUD Versus Plugin Import Shapes

When you write directly to the database or use `insertBundleNested()`, variants link to messages with `messageId`.

```typescript
{
  id: "variant_1",
  messageId: "message_1",
  matches: [],
  pattern: [{ type: "text", value: "Hello" }],
}
```

When a plugin returns variants from `importFiles()`, it can omit generated ids and link a variant to a message with `messageBundleId` and `messageLocale`.

```typescript
{
  messageBundleId: "greeting",
  messageLocale: "en",
  matches: [],
  pattern: [{ type: "text", value: "Hello" }],
}
```

The SDK resolves `messageBundleId` plus `messageLocale` to the matching message and generates ids when needed.

## Next Steps

- [Data Model](/docs/data-model) - Understand bundles, messages, and variants
- [CRUD API](/docs/crud-api) - Insert and query these shapes
- [Writing a Plugin](/docs/write-plugin) - Return these shapes from `importFiles()`
