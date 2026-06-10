import type { Variant } from "@inlang/sdk";

/**
 * Specificity of a variant's matches, following i18next's key resolution
 * order where the most specific key wins and the base key is the fallback:
 *
 * `key_context_plural` (3) > `key_context` (2) > `key_plural` (1) > `key` (0)
 *
 * Catchall matches and absent matches do not add specificity.
 *
 * https://www.i18next.com/translation-function/context
 * https://www.i18next.com/translation-function/context#combining-with-plurals
 */
export function matchSpecificity(variant: {
	matches?: Variant["matches"];
}): number {
	const hasLiteralMatch = (key: string) =>
		(variant.matches ?? []).some(
			(match) => match.type === "literal-match" && match.key === key
		);
	return (
		(hasLiteralMatch("context") ? 2 : 0) +
		(hasLiteralMatch("countPlural") ? 1 : 0)
	);
}
