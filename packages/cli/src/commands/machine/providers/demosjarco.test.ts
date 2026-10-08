import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createDemosjarcoTranslateProvider,
  DEMOSJARCO_TRANSLATE_API_URL,
  MAX_CONCURRENT_REQUESTS,
  MAX_RETRIES,
  MAX_RETRY_DELAY_MS,
  parseRetryAfter,
  REQUEST_TIMEOUT_MS,
  SERVICE_UNAVAILABLE_ERROR,
} from "./demosjarco.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Translates "Hello World" to German, flushing any retry backoff timers. */
async function translateFlushingTimers(
  provider: ReturnType<typeof createDemosjarcoTranslateProvider>,
) {
  vi.useFakeTimers();
  const pending = provider.translateText({
    text: "Hello World",
    sourceLocale: "en",
    targetLocale: "de",
  });
  await vi.runAllTimersAsync();
  return pending;
}

function okResponse(translatedText: string) {
  return {
    ok: true,
    json: async () => ({ data: { translations: [{ translatedText }] } }),
  };
}

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

  test("reports the service as unavailable after retrying on a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const result = await translateFlushingTimers(provider);

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  test("bounds every request with a request timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { translations: [{ translatedText: "Hallo Welt" }] },
        }),
      }),
    );

    const provider = createDemosjarcoTranslateProvider();
    await provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    expect(timeoutSpy).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
  });

  test("reports the service as unavailable after retrying when the request times out", async () => {
    // This is exactly what Node/undici's fetch rejects with when the
    // AbortSignal.timeout() passed to it fires.
    const fetchMock = vi
      .fn()
      .mockRejectedValue(
        new DOMException("The operation was aborted.", "TimeoutError"),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const result = await translateFlushingTimers(provider);

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  test("reports the service as unavailable after retrying on a server error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const result = await translateFlushingTimers(provider);

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  test("reports the service as unavailable after retrying when throttled with 429", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const result = await translateFlushingTimers(provider);

    expect(result).toEqual({
      ok: false,
      error: SERVICE_UNAVAILABLE_ERROR,
      unavailable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  test.each([
    ["an unexpected shape", { unexpected: "shape" }],
    ["an empty translations array", { data: { translations: [] } }],
    [
      "a non-string translatedText",
      { data: { translations: [{ translatedText: null }] } },
    ],
  ])(
    "reports the service as unavailable on a malformed response body (%s)",
    async (_case, body) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => body,
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
    },
  );

  test("reports the service as unavailable when the response body isn't valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token in JSON");
        },
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

  test("recovers when a retry succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      })
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(okResponse("Hallo Welt"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const result = await translateFlushingTimers(provider);

    expect(result).toEqual({ ok: true, translatedText: "Hallo Welt" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("waits as long as the Retry-After header asks before retrying", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "retry-after": "7" }),
      })
      .mockResolvedValueOnce(okResponse("Hallo Welt"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    const pending = provider.translateText({
      text: "Hello World",
      sourceLocale: "en",
      targetLocale: "de",
    });

    await vi.advanceTimersByTimeAsync(6_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(pending).resolves.toEqual({
      ok: true,
      translatedText: "Hallo Welt",
    });
  });

  test("does not retry a client error or a malformed body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createDemosjarcoTranslateProvider();
    await translateFlushingTimers(provider);
    await translateFlushingTimers(provider);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test(`keeps at most ${MAX_CONCURRENT_REQUESTS} requests in flight`, async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const releases: Array<() => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise<void>((resolve) => releases.push(resolve));
        inFlight--;
        return okResponse("Hallo Welt");
      }),
    );

    const provider = createDemosjarcoTranslateProvider();
    const pending = Array.from({ length: 20 }, (_, index) =>
      provider.translateText({
        text: `Hello ${index}`,
        sourceLocale: "en",
        targetLocale: "de",
      }),
    );

    // Release requests one at a time until all 20 have been served.
    for (let served = 0; served < 20; served++) {
      await vi.waitFor(() => expect(releases.length).toBeGreaterThan(0));
      expect(inFlight).toBeLessThanOrEqual(MAX_CONCURRENT_REQUESTS);
      releases.shift()?.();
    }

    const results = await Promise.all(pending);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(maxInFlight).toBe(MAX_CONCURRENT_REQUESTS);
  });
});

describe("parseRetryAfter", () => {
  test("parses delay seconds", () => {
    expect(parseRetryAfter("3")).toBe(3_000);
  });

  test("parses an HTTP date relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:05 GMT")).toBe(5_000);
  });

  test("caps long waits and clamps dates in the past", () => {
    expect(parseRetryAfter("86400")).toBe(MAX_RETRY_DELAY_MS);
    expect(parseRetryAfter("Thu, 01 Jan 1970 00:00:00 GMT")).toBe(0);
  });

  test("ignores a missing or unparseable header", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter("soon")).toBeUndefined();
  });
});
