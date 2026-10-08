import type {
  Bundle,
  InlangPlugin,
  MessageImport,
  VariantImport,
} from "@inlang/sdk";
import { PluginSettings } from "./settings.js";
import { parseMessage } from "./parse.js";
import { serializeMessage } from "./serialize.js";

export const PLUGIN_KEY = "plugin.inlang.icu-messageformat-1";

type PluginConfig = {
  [PLUGIN_KEY]: PluginSettings;
};

type ToBeImportedArgs = Parameters<
  NonNullable<InlangPlugin<PluginConfig>["toBeImportedFiles"]>
>[0];
type ImportFilesArgs = Parameters<
  NonNullable<InlangPlugin<PluginConfig>["importFiles"]>
>[0];
type ExportFilesArgs = Parameters<
  NonNullable<InlangPlugin<PluginConfig>["exportFiles"]>
>[0];

export const plugin: InlangPlugin<PluginConfig> = {
  key: PLUGIN_KEY,
  settingsSchema: PluginSettings,

  toBeImportedFiles: async ({ settings }: ToBeImportedArgs) => {
    const pathPatterns = settings[PLUGIN_KEY]?.pathPattern
      ? Array.isArray(settings[PLUGIN_KEY].pathPattern)
        ? settings[PLUGIN_KEY].pathPattern
        : [settings[PLUGIN_KEY].pathPattern]
      : [];

    const files = [] as { path: string; locale: string }[];
    for (const pathPattern of pathPatterns) {
      for (const locale of settings.locales) {
        files.push({
          locale,
          path: pathPattern.replace(/{locale}/, locale),
        });
      }
    }

    return files;
  },

  importFiles: ({ files }: ImportFilesArgs) => {
    const bundles = new Map<string, Bundle>();
    const messages: MessageImport[] = [];
    const variants: VariantImport[] = [];
    const decoder = new TextDecoder("utf-8");

    for (const file of files) {
      const json = JSON.parse(decoder.decode(file.content));
      for (const [key, value] of Object.entries(json)) {
        if (key === "$schema") continue;
        if (typeof value !== "string") continue;

        const parsed = parseMessage({
          messageSource: value,
          bundleId: key,
          locale: file.locale,
        });

        const bundle = bundles.get(key) ?? { id: key, declarations: [] };
        bundle.declarations = uniqueDeclarations([
          ...bundle.declarations,
          ...parsed.declarations,
        ]);
        bundles.set(key, bundle);

        messages.push({
          bundleId: key,
          locale: file.locale,
          selectors: parsed.selectors,
        });
        variants.push(...parsed.variants);
      }
    }

    return { bundles: [...bundles.values()], messages, variants };
  },

  exportFiles: ({ bundles, messages, variants, settings }: ExportFilesArgs) => {
    const encoder = new TextEncoder();
    const result: Record<string, Record<string, string>> = {};

    for (const message of messages) {
      const bundle = bundles.find((b) => b.id === message.bundleId);
      if (!bundle) continue;
      const messageVariants = variants.filter(
        (variant) => variant.messageId === message.id,
      );
      const serialized = serializeMessage({
        bundle,
        message,
        variants: messageVariants,
      });

      result[message.locale] = {
        ...result[message.locale],
        [message.bundleId]: serialized,
      };
    }

    const pathPattern = settings[PLUGIN_KEY]?.pathPattern;
    const formattedPathPatterns = Array.isArray(pathPattern)
      ? pathPattern
      : [pathPattern ?? "{locale}.json"];

    return Object.entries(result).flatMap(([locale, messagesByKey]) =>
      formattedPathPatterns.map((pattern) => ({
        locale,
        name: pattern.replace(/{locale}/, locale),
        content: encoder.encode(JSON.stringify(messagesByKey, undefined, "\t")),
      })),
    );
  },
};

function uniqueDeclarations(
  declarations: Bundle["declarations"],
): Bundle["declarations"] {
  const seen = new Map<string, Bundle["declarations"][number]>();
  for (const declaration of declarations) {
    const key = JSON.stringify(declaration);
    if (!seen.has(key)) {
      seen.set(key, declaration);
    }
  }
  return [...seen.values()];
}
