import { expect, test } from "vitest";
import i18next from "i18next";
import type { Bundle, Message, Variant } from "@inlang/sdk";
import { importFiles } from "./importFiles.js";
import { exportFiles } from "./exportFiles.js";

// Upstream fixtures: i18next/i18next@edaea71b729aa54dc35d5e7dfea72b2b12f24a61
// test/runtime/translator/translator.translate.plural.test.js
// test/runtime/translator/translator.translate.context.test.js
// Additional cases exercise sparse resources and suffix ambiguity. Expected
// lookup results come from the real, pinned i18next dev dependency.
type Resources = Record<string, Record<string, string>>;
type Imported = Awaited<ReturnType<typeof importFiles>>;
type Inputs = Record<string, string | number | boolean>;

async function setup(resources: Resources) {
	const runtime = i18next.createInstance();
	await runtime.init({
		lng: Object.keys(resources)[0],
		fallbackLng: false,
		resources: Object.fromEntries(
			Object.entries(resources).map(([locale, translation]) => [
				locale,
				{ translation },
			])
		),
	});
	const imported = await importFiles({
		settings: {
			baseLocale: Object.keys(resources)[0]!,
			locales: Object.keys(resources),
			"plugin.inlang.i18next": { pathPattern: "./locales/{locale}.json" },
		},
		files: Object.entries(resources).map(([locale, json]) => ({
			locale,
			content: new TextEncoder().encode(JSON.stringify(json)),
		})),
	});
	return { runtime, imported };
}

// Evaluate only the MF2 subset produced by this importer: input variables,
// Intl plural locals, literal/catchall matches and interpolated text. This is
// independent of i18next key parsing and makes first-match behavior observable.
function evaluate(
	imported: Imported,
	root: string,
	locale: string,
	inputs: Inputs
) {
	const bundle = imported.bundles.find((bundle) => bundle.id === root);
	if (!bundle) throw new Error(`Missing imported bundle: ${root}`);
	const variables: Inputs = { ...inputs };
	for (const declaration of bundle.declarations ?? []) {
		if (declaration.type !== "local-variable") continue;
		const expression = declaration.value;
		if (
			expression.type !== "expression" ||
			expression.arg.type !== "variable-reference" ||
			expression.annotation?.name !== "plural"
		)
			throw new Error("Unsupported test expression");
		const ordinal = expression.annotation.options.some(
			(option) =>
				option.name === "type" &&
				option.value.type === "literal" &&
				option.value.value === "ordinal"
		);
		variables[declaration.name] = new Intl.PluralRules(locale, {
			type: ordinal ? "ordinal" : "cardinal",
		}).select(Number(variables[expression.arg.name]));
	}
	const variant = imported.variants.find(
		(variant) =>
			variant.messageBundleId === root &&
			variant.messageLocale === locale &&
			variant.matches?.every(
				(match) =>
					match.type === "catchall-match" ||
					String(variables[match.key]) === match.value
			)
	);
	if (!variant)
		throw new Error(`No matching imported variant: ${root}/${locale}`);
	if (!variant.pattern) throw new Error("Missing imported pattern");
	return variant.pattern
		.map((part) => {
			if (part.type === "text") return part.value;
			if (
				part.type === "expression" &&
				part.arg.type === "variable-reference"
			) {
				return String(variables[part.arg.name]);
			}
			throw new Error("Unsupported test pattern");
		})
		.join("");
}

async function expectLookup(
	resources: Resources,
	root: string,
	locale: string,
	inputs: Inputs,
	expected: string
) {
	const { runtime, imported } = await setup(resources);
	expect(runtime.t(root, { lng: locale, ...inputs })).toBe(expected);
	expect(evaluate(imported, root, locale, inputs)).toBe(expected);
	return imported;
}

test("upstream: underscored root with ordinal plurals", async () => {
	await expectLookup(
		{
			en: {
				pos_test_ordinal_one: "pos_test_en_one",
				pos_test_ordinal_other: "pos_test_en_other",
			},
		},
		"pos_test",
		"en",
		{ count: 1, ordinal: true },
		"pos_test_en_one"
	);
});

test("underscored root with two contexts", async () => {
	await expectLookup(
		{
			en: {
				key_separator_context_male: "male value",
				key_separator_context_female: "female value",
			},
		},
		"key_separator_context",
		"en",
		{ context: "male" },
		"male value"
	);
});

test("underscored root with one context and no base key", async () => {
	await expectLookup(
		{ en: { key_separator_context_male: "male value" } },
		"key_separator_context",
		"en",
		{ context: "male" },
		"male value"
	);
});

test("single context needs no base key or second context", async () => {
	await expectLookup(
		{ en: { friend_male: "boyfriend" } },
		"friend",
		"en",
		{ context: "male" },
		"boyfriend"
	);
});

test("single context with cardinal plurals", async () => {
	await expectLookup(
		{
			en: {
				friend_male_one: "one boyfriend",
				friend_male_other: "{{count}} boyfriends",
			},
		},
		"friend",
		"en",
		{ context: "male", count: 2 },
		"2 boyfriends"
	);
});

test("single context with ordinal plurals", async () => {
	await expectLookup(
		{
			en: {
				race_male_ordinal_one: "his {{count}}st race",
				race_male_ordinal_other: "his {{count}}th race",
			},
		},
		"race",
		"en",
		{ context: "male", count: 1, ordinal: true },
		"his 1st race"
	);
});

test("upstream: a single month context can contain cardinal and ordinal forms", async () => {
	await expectLookup(
		{
			en: {
				oTest_month_ordinal_one: "Every {{count}}st month (ctx)",
				oTest_month_one: "Every month (ctx)",
			},
		},
		"oTest",
		"en",
		{ count: 1, ordinal: true, context: "month" },
		"Every 1st month (ctx)"
	);
});

test("context classification stays consistent across sparse locales", async () => {
	const resources = {
		en: { friend_male_one: "his", friend_female_one: "hers" },
		de: { friend_male_one: "sein" },
	};
	const imported = await expectLookup(
		resources,
		"friend",
		"de",
		{ context: "male", count: 1 },
		"sein"
	);
	expect(imported.bundles.map((bundle) => bundle.id)).toEqual(["friend"]);
});

test("context values can contain underscores", async () => {
	await expectLookup(
		{
			en: {
				friend: "friend",
				friend_male_formal: "formal boyfriend",
				friend_female_formal: "formal girlfriend",
			},
		},
		"friend",
		"en",
		{ context: "male_formal" },
		"formal boyfriend"
	);
});

test("base key remains the fallback for missing contexts", async () => {
	await expectLookup(
		{
			en: {
				friend: "friend",
				friend_male: "boyfriend",
			},
		},
		"friend",
		"en",
		{ context: "unknown" },
		"friend"
	);
});

test("ordinal zero is not an English exact-zero override", async () => {
	await expectLookup(
		{
			en: {
				rank_ordinal_zero: "ordinal zero",
				rank_ordinal_other: "ordinal other",
			},
		},
		"rank",
		"en",
		{ count: 0, ordinal: true },
		"ordinal other"
	);
});

test("Welsh ordinal zero matches nonzero counts too", async () => {
	await expectLookup(
		{
			cy: {
				rank_ordinal_zero: "ordinal zero",
				rank_ordinal_other: "ordinal other",
			},
		},
		"rank",
		"cy",
		{ count: 7, ordinal: true },
		"ordinal zero"
	);
});

test("mixed cardinal and ordinal lookups select their own plural type", async () => {
	const resources = {
		en: {
			rank_one: "cardinal one",
			rank_other: "cardinal other",
			rank_ordinal_one: "ordinal one",
			rank_ordinal_other: "ordinal other",
		},
	};
	await expectLookup(resources, "rank", "en", { count: 1 }, "cardinal one");
	await expectLookup(
		resources,
		"rank",
		"en",
		{ count: 1, ordinal: true },
		"ordinal one"
	);
});

test("roundtrip preserves cardinal zero beside ordinal zero", async () => {
	const resources = {
		cy: {
			rank_zero: "cardinal zero",
			rank_other: "cardinal other",
			rank_ordinal_zero: "ordinal zero",
			rank_ordinal_other: "ordinal other",
		},
	};
	const { runtime, imported } = await setup(resources);
	// Assign deterministic SDK identities; merge per-key message imports in
	// the same bundle/locale, as persisted SDK messages do.
	const messages = [
		...new Map(
			imported.messages.map((message) => [
				`${message.bundleId}/${message.locale}`,
				message,
			])
		).values(),
	].map((message, index) => ({ ...message, id: `message-${index}` }));
	const variants = imported.variants.map((variant, index) => ({
		...variant,
		id: `variant-${index}`,
		messageId: messages.find(
			(message) =>
				message.bundleId === variant.messageBundleId &&
				message.locale === variant.messageLocale
		)!.id,
	}));
	const exported = await exportFiles({
		settings: {
			baseLocale: "cy",
			locales: ["cy"],
			"plugin.inlang.i18next": { pathPattern: "./locales/{locale}.json" },
		},
		bundles: imported.bundles as Bundle[],
		messages: messages as Message[],
		variants: variants as Variant[],
	});
	const json = JSON.parse(new TextDecoder().decode(exported[0]!.content));
	const after = i18next.createInstance();
	await after.init({
		lng: "cy",
		fallbackLng: false,
		resources: { cy: { translation: json } },
	});
	expect(after.t("rank", { count: 0 })).toBe(runtime.t("rank", { count: 0 }));
	expect(json).toEqual(resources.cy);
});
