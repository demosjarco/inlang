import { log } from "../../../utilities/log.js";
import { createDeepLTranslateProvider } from "./deepl.js";
import { createGoogleTranslateProvider } from "./google.js";
import { createInlangTranslateProvider } from "./inlang.js";
import type { MachineTranslateProvider } from "./types.js";

export const PROVIDER_ENV = "INLANG_MACHINE_TRANSLATE_PROVIDER";
export const GOOGLE_API_KEY_ENV = "INLANG_GOOGLE_TRANSLATE_API_KEY";
export const DEEPL_API_KEY_ENV = "INLANG_DEEPL_API_KEY";
export const INLANG_MODEL_ENV = "INLANG_TRANSLATE_MODEL";

export type MachineTranslateProviderName = "google" | "deepl" | "inlang";

const BYOK_URL = "https://inlang.com/m/2qj2w8pu/app-inlang-cli/byok";
const DEEPL_DOCS_URL =
  "https://developers.deepl.com/docs/getting-started/quickstart";

/**
 * Determines which provider to use.
 *
 * When `INLANG_MACHINE_TRANSLATE_PROVIDER` is set, that provider is used. When
 * it is unset, an already-configured BYOK provider (Google or DeepL) is used if
 * its API key is present; otherwise the CLI falls back to the free hosted
 * inlang translation service.
 */
function resolveMachineTranslateProviderName(): MachineTranslateProviderName {
  const rawProvider = process.env[PROVIDER_ENV]?.trim();

  if (rawProvider && rawProvider.length > 0) {
    const providerName = rawProvider.toLowerCase();
    if (
      providerName !== "google" &&
      providerName !== "deepl" &&
      providerName !== "inlang"
    ) {
      throw new Error(
        [
          `Unsupported ${PROVIDER_ENV} value: "${process.env[PROVIDER_ENV]}".`,
          "Supported values: google, deepl, inlang.",
        ].join("\n"),
      );
    }
    return providerName;
  }

  // No provider configured: prefer a BYOK provider whose key is already set,
  // otherwise fall back to the free hosted inlang translation service.
  if (process.env[GOOGLE_API_KEY_ENV]) {
    return "google";
  }
  if (process.env[DEEPL_API_KEY_ENV]) {
    return "deepl";
  }
  return "inlang";
}

export function resolveMachineTranslateProvider(): MachineTranslateProvider {
  const providerName = resolveMachineTranslateProviderName();

  if (providerName === "inlang") {
    log.warn(
      [
        "Using the free inlang translation service. Stability is not guaranteed.",
        "Providing your own API key is recommended.",
        `Set ${PROVIDER_ENV} to "google" or "deepl" and provide the matching API key to use your own provider.`,
        `See ${BYOK_URL}`,
      ].join("\n"),
    );
    return createInlangTranslateProvider(process.env[INLANG_MODEL_ENV]);
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
