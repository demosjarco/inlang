import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createDemosjarcoTranslateProvider,
  DEMOSJARCO_TRANSLATE_API_URL,
  SERVICE_UNAVAILABLE_ERROR,
} from "./demosjarco.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createDemosjarcoTranslateProvider", () => {
  test("translates text via the free hosted service", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hallo Welt" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({ ok: true, translatedText: "Hallo Welt" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${DEMOSJARCO_TRANSLATE_API_URL}?` +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
        }),
      { method: "POST", signal: expect.any(AbortSignal) },
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

    const provider = createDemosjarcoTranslateProvider(
      "@cf/google/gemma-4-26b-a4b-it",
    );
    await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEMOSJARCO_TRANSLATE_API_URL}?` +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
          model: "@cf/google/gemma-4-26b-a4b-it",
        }),
      { method: "POST", signal: expect.any(AbortSignal) },
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

    const provider = createDemosjarcoTranslateProvider(undefined, true);
    await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${DEMOSJARCO_TRANSLATE_API_URL}?` +
        new URLSearchParams({
          q: "Hello World",
          target: "de",
          source: "en",
          format: "html",
          zdr: "true",
        }),
      { method: "POST", signal: expect.any(AbortSignal) },
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

    const provider = createDemosjarcoTranslateProvider();
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

    const provider = createDemosjarcoTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
  });

  test("reports the service as unavailable when the request times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "TimeoutError")),
    );

    const provider = createDemosjarcoTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
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

    const provider = createDemosjarcoTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
  });

  test("reports the service as unavailable when throttled with 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      }),
    );

    const provider = createDemosjarcoTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
  });

  test("reports the service as unavailable on a malformed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: "shape" }),
      }),
    );

    const provider = createDemosjarcoTranslateProvider();
    const result = await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
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

    const provider = createDemosjarcoTranslateProvider();
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
