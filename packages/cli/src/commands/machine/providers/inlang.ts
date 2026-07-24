import type { MachineTranslateProvider, TranslateTextArgs } from "./types.js";

/**
 * The free, hosted translation service used as the default fallback when no
 * BYOK provider is configured. It mirrors the Google Cloud Translation v2 API
 * surface, so the response shape matches the Google provider.
 *
 * @see https://translate.demosjarco.dev
 */
export const INLANG_TRANSLATE_API_URL =
  "https://translate.demosjarco.dev/language/translate/v2";

const BYOK_URL = "https://inlang.com/m/2qj2w8pu/app-inlang-cli/byok";

/**
 * Shown when the hosted service can't be reached (network error or the service
 * has been shut down). Points users at bringing their own API key instead.
 */
export const SERVICE_UNAVAILABLE_ERROR = [
  "inlang's free translation service is not available.",
  'Set INLANG_MACHINE_TRANSLATE_PROVIDER to "google" or "deepl" and provide your own API key.',
  `See ${BYOK_URL}`,
].join("\n");

export function createInlangTranslateProvider(
  model?: string,
): MachineTranslateProvider {
  return {
    async translateText(args: TranslateTextArgs) {
      const query = new URLSearchParams({
        q: args.text,
        target: args.targetLocale,
        source: args.sourceLocale,
        // The service currently only supports plain-text translation.
        format: "text",
      });

      // The service doesn't use API keys; an optional model can be pinned via
      // INLANG_TRANSLATE_MODEL, otherwise the gateway-configured default is used.
      if (model && model.length > 0) {
        query.set("model", model);
      }

      let response: Response;
      try {
        response = await fetch(`${INLANG_TRANSLATE_API_URL}?${query}`, {
          method: "POST",
        });
      } catch {
        // Endpoint unreachable (e.g. the service was shut down).
        return { ok: false, error: SERVICE_UNAVAILABLE_ERROR };
      }

      if (!response.ok) {
        // A server-side error usually means the hosted service is unavailable.
        if (response.status >= 500) {
          return { ok: false, error: SERVICE_UNAVAILABLE_ERROR };
        }
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
