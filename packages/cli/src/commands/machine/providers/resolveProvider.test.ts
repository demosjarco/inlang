import { afterEach, test, expect, vi } from "vitest";
import { resolveMachineTranslateProvider } from "./resolveProvider.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("defaults to google provider", () => {
  vi.stubEnv("INLANG_GOOGLE_TRANSLATE_API_KEY", "google-key");
  vi.stubEnv("INLANG_MACHINE_TRANSLATE_PROVIDER", "");

  const provider = resolveMachineTranslateProvider();
  expect(provider).toBeDefined();
});

test("requires INLANG_GOOGLE_TRANSLATE_API_KEY for google provider", () => {
  vi.stubEnv("INLANG_MACHINE_TRANSLATE_PROVIDER", "google");
  vi.stubEnv("INLANG_GOOGLE_TRANSLATE_API_KEY", "");

  expect(() => resolveMachineTranslateProvider()).toThrow(
    "INLANG_GOOGLE_TRANSLATE_API_KEY must be set",
  );
});

test("requires INLANG_DEEPL_API_KEY for deepl provider", () => {
  vi.stubEnv("INLANG_MACHINE_TRANSLATE_PROVIDER", "deepl");
  vi.stubEnv("INLANG_DEEPL_API_KEY", "");

  expect(() => resolveMachineTranslateProvider()).toThrow(
    "INLANG_DEEPL_API_KEY must be set",
  );
});

test("rejects unsupported provider values", () => {
  vi.stubEnv("INLANG_MACHINE_TRANSLATE_PROVIDER", "azure");

  expect(() => resolveMachineTranslateProvider()).toThrow(
    'Unsupported INLANG_MACHINE_TRANSLATE_PROVIDER value: "azure"',
  );
});
