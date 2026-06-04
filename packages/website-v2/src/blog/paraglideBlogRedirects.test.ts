import { describe, expect, it } from "vitest";
import {
  getParaglideBlogRedirect,
  getParaglideBlogRedirectForPath,
} from "./paraglideBlogRedirects";

describe("getParaglideBlogRedirect", () => {
  it("redirects copied Paraglide blog posts permanently", () => {
    expect(getParaglideBlogRedirect("tanstack-ci")).toEqual({
      href: "https://paraglidejs.com/blog/tanstack-ci",
      statusCode: 301,
    });
    expect(getParaglideBlogRedirect("dont-lazy-load")).toEqual({
      href: "https://paraglidejs.com/blog/dont-lazy-load",
      statusCode: 301,
    });
  });

  it("does not redirect unrelated inlang blog posts", () => {
    expect(
      getParaglideBlogRedirect("addressing-tanstack-feedback"),
    ).toBeUndefined();
    expect(getParaglideBlogRedirect("new-website")).toBeUndefined();
    expect(getParaglideBlogRedirect("inlang-v2-release")).toBeUndefined();
    expect(getParaglideBlogRedirect("inlang-refactor")).toBeUndefined();
    expect(getParaglideBlogRedirect("human-readable-message-ids")).toBeUndefined();
  });
});

describe("getParaglideBlogRedirectForPath", () => {
  it("redirects copied Paraglide blog paths permanently", () => {
    expect(getParaglideBlogRedirectForPath("/blog/tanstack-ci")).toEqual({
      href: "https://paraglidejs.com/blog/tanstack-ci",
      statusCode: 301,
    });
    expect(getParaglideBlogRedirectForPath("/blog/dont-lazy-load/")).toEqual({
      href: "https://paraglidejs.com/blog/dont-lazy-load",
      statusCode: 301,
    });
  });

  it("does not redirect unrelated inlang blog paths", () => {
    expect(
      getParaglideBlogRedirectForPath("/blog/addressing-tanstack-feedback"),
    ).toBeUndefined();
  });
});
