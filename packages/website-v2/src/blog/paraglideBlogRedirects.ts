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

export function getParaglideBlogRedirectForPath(pathname: string) {
  const match = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (!match) return undefined;
  return getParaglideBlogRedirect(match[1]);
}
