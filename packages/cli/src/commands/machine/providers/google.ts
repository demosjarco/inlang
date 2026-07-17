import type { MachineTranslateProvider, TranslateTextArgs } from "./types.js";

export function createGoogleTranslateProvider(
  apiKey: string,
): MachineTranslateProvider {
  return {
    async translateText(args: TranslateTextArgs) {
      const response = await fetch(
        "https://translation.googleapis.com/language/translate/v2?" +
          new URLSearchParams({
            q: args.text,
            target: args.targetLocale,
            source: args.sourceLocale,
            format: "html",
            key: apiKey,
          }),
        { method: "POST" },
      );

      if (!response.ok) {
        return {
          ok: false,
          error: `${response.status} ${response.statusText}: translating from ${args.sourceLocale} to ${args.targetLocale}`,
        };
      }

      const json = await response.json();
      return {
        ok: true,
        translatedText: json.data.translations[0].translatedText,
      };
    },
  };
}
