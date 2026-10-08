import type { Bundle, Message, Variant } from "@inlang/sdk";

export const exampleWithoutSelectors: {
  bundles: Bundle[];
  messages: Message[];
  variants: Variant[];
} = {
  bundles: [
    {
      id: "message-bundle-id",
      declarations: [],
    },
  ],
  messages: [
    {
      bundle_id: "message-bundle-id",
      id: "message-id-en",
      locale: "en",
      selectors: [],
    },
    {
      bundle_id: "message-bundle-id",
      id: "message-id-de",
      locale: "de",
      selectors: [],
    },
  ],
  variants: [
    {
      message_id: "message-id-en",
      id: "variant-id-en-*",
      matches: [],
      pattern: [{ type: "text", value: "{count} new messages" }],
    },
    {
      message_id: "message-id-de",
      id: "variant-id-de-*",
      matches: [],
      pattern: [{ type: "text", value: "{count} neue Nachrichten" }],
    },
  ],
};
