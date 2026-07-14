import { afterEach, describe, expect, test, vi } from "vitest";
import { createGoogleTranslateProvider } from "./google.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createGoogleTranslateProvider", () => {
  test("translates text via Google API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hallo Welt" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGoogleTranslateProvider("google-key");
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({ ok: true, translatedText: "Hallo Welt" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://translation.googleapis.com/language/translate/v2?" +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
          key: "google-key",
        }),
      { method: "POST" },
    );
  });

  test("returns error when API request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      }),
    );

    const provider = createGoogleTranslateProvider("google-key");
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({
      ok: false,
      error: "403 Forbidden: translating from en to de",
    });
  });
});
