import { createDeepLTranslateProvider } from "./deepl.js";
import { createGoogleTranslateProvider } from "./google.js";
import type { MachineTranslateProvider } from "./types.js";

export const PROVIDER_ENV = "INLANG_MACHINE_TRANSLATE_PROVIDER";
export const GOOGLE_API_KEY_ENV = "INLANG_GOOGLE_TRANSLATE_API_KEY";
export const DEEPL_API_KEY_ENV = "INLANG_DEEPL_API_KEY";

export type MachineTranslateProviderName = "google" | "deepl";

const BYOK_URL = "https://inlang.com/m/2qj2w8pu/app-inlang-cli/byok";
const DEEPL_DOCS_URL = "https://developers.deepl.com/docs/getting-started/quickstart";

export function resolveMachineTranslateProvider(): MachineTranslateProvider {
  const rawProvider = process.env[PROVIDER_ENV]?.trim();
  const providerName = (
    rawProvider && rawProvider.length > 0 ? rawProvider : "google"
  ).toLowerCase() as MachineTranslateProviderName;

  if (providerName !== "google" && providerName !== "deepl") {
    throw new Error(
      [
        `Unsupported ${PROVIDER_ENV} value: "${process.env[PROVIDER_ENV]}".`,
        "Supported values: google, deepl.",
      ].join("\n"),
    );
  }

  if (providerName === "deepl") {
    const apiKey = process.env[DEEPL_API_KEY_ENV];
    if (!apiKey) {
      throw new Error(
        [
          `${DEEPL_API_KEY_ENV} must be set to use machine translate with DeepL.`,
          "Create your own DeepL API key and export it before running this command.",
          `See ${DEEPL_DOCS_URL}`,
          `See ${BYOK_URL}`,
        ].join("\n"),
      );
    }
    return createDeepLTranslateProvider(apiKey);
  }

  const apiKey = process.env[GOOGLE_API_KEY_ENV];
  if (!apiKey) {
    throw new Error(
      [
        `${GOOGLE_API_KEY_ENV} must be set to use machine translate.`,
        "Create your own Google Cloud Translation API key and export it before running this command.",
        `See ${BYOK_URL}`,
      ].join("\n"),
    );
  }
  return createGoogleTranslateProvider(apiKey);
}
