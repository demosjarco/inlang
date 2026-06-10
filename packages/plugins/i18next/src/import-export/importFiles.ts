/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
	Bundle,
	Message,
	Pattern,
	VariableReference,
	Variant,
} from "@inlang/sdk";
import { type plugin } from "../plugin.js";
import { flatten } from "flat";
import type { BundleImport, MessageImport, VariantImport } from "@inlang/sdk";
import { matchSpecificity } from "./matchSpecificity.js";
import type { PluginSettings } from "../settings.js";

export const importFiles: NonNullable<(typeof plugin)["importFiles"]> = async ({
	files,
	settings,
}) => {
	const bundles: BundleImport[] = [];
	const messages: MessageImport[] = [];
	const variants: VariantImport[] = [];

	for (const file of files) {
		const namespace = file.toBeImportedFilesMetadata?.namespace;
		const result = parseFile({
			namespace,
			locale: file.locale,
			content: file.content,
			settings: settings?.["plugin.inlang.i18next"],
		});
		bundles.push(...result.bundles);
		messages.push(...result.messages);
		variants.push(...result.variants);
	}

	// merge the bundle declarations
	const uniqueBundleIds = [...new Set(bundles.map((bundle) => bundle.id))];
	const uniqueBundles: BundleImport[] = uniqueBundleIds.map((id) => {
		const _bundles = bundles.filter((bundle) => bundle.id === id);
		const declarations = removeDuplicates(
			_bundles.flatMap((bundle) => bundle.declarations)
		);
		return { id, declarations };
	});

	return { bundles: uniqueBundles, messages, variants };
};

function parseFile(args: {
	namespace?: string;
	locale: string;
	content: ArrayBuffer;
	settings?: PluginSettings;
}): {
	bundles: BundleImport[];
	messages: MessageImport[];
	variants: VariantImport[];
} {
	const resource: Record<string, string> = flatten(
		JSON.parse(new TextDecoder().decode(args.content))
	);

	const bundles: BundleImport[] = [];
	const messages: MessageImport[] = [];
	const variants: VariantImport[] = [];

	for (const key in resource) {
		const value = resource[key]!;
		const { bundle, message, variant } = parseMessage({
			namespace: args.namespace,
			key,
			value,
			locale: args.locale,
			resource,
			settings: args.settings,
		});
		bundles.push(bundle);
		messages.push(message);
		variants.push(variant);
	}

	// order each bundle's variants most-specific-first (`friend_male_one` >
	// `friend_male` > `friend_one` > `friend`) so that first-match-wins
	// consumers (e.g. the paraglide compiler) resolve context and plurals
	// the way i18next does.
	// https://github.com/opral/inlang/issues/4354
	const variantsByBundleId = new Map<string, VariantImport[]>();
	for (const variant of variants) {
		const group = variantsByBundleId.get(variant.messageBundleId!) ?? [];
		group.push(variant);
		variantsByBundleId.set(variant.messageBundleId!, group);
	}
	const sortedVariants = [...variantsByBundleId.values()].flatMap((group) =>
		group.sort((a, b) => matchSpecificity(b) - matchSpecificity(a))
	);

	return { bundles, messages, variants: sortedVariants };
}

function parseMessage(args: {
	namespace?: string;
	key: string;
	value: string;
	locale: string;
	resource: Record<string, any>;
	settings?: PluginSettings;
}): { bundle: BundleImport; message: MessageImport; variant: VariantImport } {
	const pattern = parsePattern(args.value, args.settings);

	// i18next suffixes keys with context or plurals
	// "friend_female_one" -> "friend"
	let bundleId = args.key.split("_")[0]!;
	if (args.namespace) {
		// following i18next's convention
		// https://www.i18next.com/principles/namespaces#sample
		bundleId = `${args.namespace}:${bundleId}`;
	}

	const bundle: Bundle = {
		id: bundleId,
		declarations: pattern.variableReferences.map((variableReference) => ({
			type: "input-variable",
			name: variableReference.name,
		})),
	};

	const message: MessageImport = {
		bundleId: bundleId,
		selectors: [],
		locale: args.locale,
	};

	const variant: VariantImport = {
		messageBundleId: bundleId,
		messageLocale: args.locale,
		matches: [],
		pattern: pattern.result,
	};

	// plurals, see https://www.i18next.com/misc/json-format#i18next-json-v4
	const hasPlurals = testForPlurals(args.key);
	// context is used see https://www.i18next.com/translation-function/context
	const hasContext = hasPlurals
		? args.key.split("_").length === 3
		: args.key.split("_").length === 2;

	// sibling keys of the same bundle (`friend` -> `friend_one`,
	// `friend_male_one`, ...) decide which selectors the bundle has. base
	// keys are the fallback for their context/plural siblings and get
	// explicit catchall matches.
	// https://www.i18next.com/translation-function/context#combining-with-plurals
	const siblingKeys = Object.keys(args.resource).filter(
		(key) => key.split("_")[0] === args.key.split("_")[0]
	);
	const bundleHasPlurals = siblingKeys.some(testForPlurals);
	const bundleHasContext = siblingKeys.some((key) =>
		testForPlurals(key)
			? key.split("_").length === 3
			: key.split("_").length === 2
	);

	const selectors: Message["selectors"] = [];
	const matches: Variant["matches"] = [];

	if (bundleHasContext) {
		bundle.declarations.push({
			type: "input-variable",
			name: "context",
		});
		selectors.push({
			type: "variable-reference",
			name: "context",
		});
		matches.push(
			hasContext
				? {
						type: "literal-match",
						// i18next always uses "context" as the key
						// "friend_male" -> ["friend", "male"]
						key: "context",
						value: args.key.split("_")[1]!,
					}
				: // the base key is the fallback for all context variants
					{
						type: "catchall-match",
						key: "context",
					}
		);
	}

	if (bundleHasPlurals) {
		bundle.declarations.push({
			type: "input-variable",
			name: "count",
		});
		bundle.declarations.push({
			type: "local-variable",
			name: "countPlural",
			value: {
				type: "expression",
				arg: {
					type: "variable-reference",
					name: "count",
				},
				annotation: {
					type: "function-reference",
					name: "plural",
					options: [],
				},
			},
		});
		selectors.push({
			type: "variable-reference",
			// i18next only allows matching against a count variable.
			// suffixing plural here because the inlang sdk v2 purposefully
			// did not allow using a variable with a function like `plural`
			// without declaring a new variable
			name: "countPlural",
		});
		matches.push(
			hasPlurals
				? {
						type: "literal-match",
						key: "countPlural",
						value: args.key.split("_").at(-1)!,
					}
				: // the base key is the fallback for all plural variants
					{
						type: "catchall-match",
						key: "countPlural",
					}
		);
	}

	message.selectors = selectors;
	variant.matches = matches;

	bundle.declarations = removeDuplicates(bundle.declarations);

	return { bundle, message, variant };
}

function parsePattern(
	value: string,
	settings?: PluginSettings
): {
	variableReferences: VariableReference[];
	result: Pattern;
} {
	const result: Variant["pattern"] = [];
	const variableReferences: VariableReference[] = [];

	const pattern = settings?.variableReferencePattern ?? ["{{", "}}"];
	const openPattern = pattern[0];
	const closePattern = pattern[1];
	let buffer = "";

	const flushBuffer = () => {
		if (buffer.length > 0) {
			result.push({ type: "text", value: buffer });
			buffer = "";
		}
	};

	for (let index = 0; index < value.length; index += 1) {
		// parse interpolation first to avoid conflicts with custom patterns
		if (openPattern && closePattern && value.startsWith(openPattern, index)) {
			const closingIndex = value.indexOf(
				closePattern,
				index + openPattern.length
			);
			if (closingIndex !== -1) {
				flushBuffer();

				// i18next allows for annotations like `{{name, uppercase}}`
				const subparts = value
					.slice(index + openPattern.length, closingIndex)
					.split(",");

				const arg = subparts[0]?.trim();
				const annotation = subparts[1]?.trim();

				if (arg === undefined) {
					throw new Error(
						"Expected an argument in the expression but received undefined."
					);
				}

				const variableReference: VariableReference = {
					type: "variable-reference",
					name: arg,
				};

				variableReferences.push(variableReference);

				result.push({
					type: "expression",
					arg: variableReference,
					...(annotation && {
						annotation: {
							type: "function-reference",
							name: annotation,
							options: [],
						},
					}),
				});

				index = closingIndex + closePattern.length - 1;
				continue;
			}
		}

		const markupMatch = parseMarkupTagAt(value, index);
		if (markupMatch) {
			flushBuffer();
			result.push(markupMatch.part);
			index = markupMatch.endIndex;
			continue;
		}

		buffer += value[index]!;
	}

	flushBuffer();

	return { variableReferences, result };
}

function parseMarkupTagAt(
	value: string,
	startIndex: number
):
	| {
			part: Pattern[number];
			endIndex: number;
	  }
	| undefined {
	const rest = value.slice(startIndex);

	const standalone = rest.match(/^<([A-Za-z0-9][A-Za-z0-9_.-]*)\s*\/>/);
	if (standalone) {
		const name = standalone[1]!;
		return {
			part: { type: "markup-standalone", name },
			endIndex: startIndex + standalone[0].length - 1,
		};
	}

	const end = rest.match(/^<\/([A-Za-z0-9][A-Za-z0-9_.-]*)\s*>/);
	if (end) {
		const name = end[1]!;
		return {
			part: { type: "markup-end", name },
			endIndex: startIndex + end[0].length - 1,
		};
	}

	const start = rest.match(/^<([A-Za-z0-9][A-Za-z0-9_.-]*)\s*>/);
	if (start) {
		const name = start[1]!;
		return {
			part: { type: "markup-start", name },
			endIndex: startIndex + start[0].length - 1,
		};
	}

	return undefined;
}
const removeDuplicates = <T extends any[]>(arr: T) =>
	[...new Set(arr.map((item) => JSON.stringify(item)))].map((item) =>
		JSON.parse(item)
	);

const testForPlurals = (key: string) =>
	key.endsWith("_zero") ||
	key.endsWith("_one") ||
	key.endsWith("_two") ||
	key.endsWith("_few") ||
	key.endsWith("_many") ||
	key.endsWith("_other");
