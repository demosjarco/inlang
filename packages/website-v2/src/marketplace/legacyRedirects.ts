type LegacyRedirect = {
  uid: string;
  href: string;
  statusCode: 301 | 302;
};

const legacyRedirects: LegacyRedirect[] = [
  {
    uid: "dxnzrydw",
    href: "https://paraglidejs.com/sveltekit",
    statusCode: 301,
  },
  {
    uid: "osslbuzt",
    href: "https://paraglidejs.com/next-js",
    statusCode: 301,
  },
  {
    uid: "iljlwzfs",
    href: "https://paraglidejs.com/astro",
    statusCode: 301,
  },
];

export function getLegacyRedirect(uid: string) {
  return legacyRedirects.find((entry) => entry.uid === uid);
}

export function getParaglideStandaloneRedirect(
  uid: string,
  pagePath: string = "/",
) {
  if (uid !== "gerre34r") return undefined;
  const normalized = pagePath === "/" ? "" : pagePath;
  return {
    href: `https://paraglidejs.com${normalized}`,
    statusCode: 301 as const,
  };
}
