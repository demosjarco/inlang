const paraglideBlogSlugs = new Set([
  "tanstack-ci",
  "dont-lazy-load",
]);

export function getParaglideBlogRedirect(slug: string) {
  if (!paraglideBlogSlugs.has(slug)) return undefined;
  return {
    href: `https://paraglidejs.com/blog/${slug}`,
    statusCode: 301 as const,
  };
}
