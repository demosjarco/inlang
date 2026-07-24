import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createInlangTranslateProvider,
  INLANG_TRANSLATE_API_URL,
  SERVICE_UNAVAILABLE_ERROR,
} from "./inlang.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createInlangTranslateProvider", () => {
  test("translates text via the free hosted service", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hallo Welt" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createInlangTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({ ok: true, translatedText: "Hallo Welt" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${INLANG_TRANSLATE_API_URL}?` +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
        }),
      { method: "POST" },
    );
  });

  test("pins the model when one is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hallo Welt" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createInlangTranslateProvider(
      "@cf/google/gemma-4-26b-a4b-it",
    );
    await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${INLANG_TRANSLATE_API_URL}?` +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
          model: "@cf/google/gemma-4-26b-a4b-it",
        }),
      { method: "POST" },
    );
  });

  test("requests zero data retention when enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hallo Welt" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createInlangTranslateProvider(undefined, true);
    await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${INLANG_TRANSLATE_API_URL}?` +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
          zdr: "true",
        }),
      { method: "POST" },
    );
  });

  test("does not request zero data retention by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hallo Welt" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createInlangTranslateProvider();
    await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("zdr");
  });

  test("reports the service as unavailable on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const provider = createInlangTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({ ok: false, error: SERVICE_UNAVAILABLE_ERROR });
  });

  test("reports the service as unavailable on a server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    const provider = createInlangTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({ ok: false, error: SERVICE_UNAVAILABLE_ERROR });
  });

  test("returns a translation error on a client error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      }),
    );

    const provider = createInlangTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "xx",
    });

    expect(result).toEqual({
      ok: false,
      error: "400 Bad Request: translating from en to xx",
    });
  });
});
