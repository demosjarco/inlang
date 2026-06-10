import { expect, test } from "vitest";
import { importFiles } from "./importFiles.js";
import {
	type Bundle,
	type LiteralMatch,
	type Message,
	type Pattern,
	type Variant,
} from "@inlang/sdk";
import { exportFiles } from "./exportFiles.js";
import type { PluginSettings } from "../settings.js";

test("single key value", async () => {
	const imported = await runImportFiles({
		key: "value",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		key: "value",
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(1);

	expect(imported.bundles[0]?.id).toStrictEqual("key");
	expect(imported.bundles[0]?.declarations).toStrictEqual([]);
	expect(imported.messages[0]?.selectors).toStrictEqual([]);
	expect(imported.variants[0]?.matches).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "value" },
	]);
});

test("key deep", async () => {
	const imported = await runImportFiles({
		keyDeep: { inner: "value" },
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyDeep: { inner: "value" },
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(1);

	expect(imported.bundles[0]?.id).toStrictEqual("keyDeep.inner");
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "value" },
	]);
});

test("keyInterpolate", async () => {
	const imported = await runImportFiles({
		keyInterpolate: "replace this {{value}}",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyInterpolate: "replace this {{value}}",
	});

	expect(imported.bundles).lengthOf(1);
	expect(imported.messages).lengthOf(1);
	expect(imported.variants).lengthOf(1);

	expect(imported.bundles[0]?.declarations).toStrictEqual([
		{ type: "input-variable", name: "value" },
	]);

	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "replace this " },
		{ type: "expression", arg: { type: "variable-reference", name: "value" } },
	] satisfies Pattern);
});

test("keyInterpolateUnescaped", async () => {
	const imported = await runImportFiles({
		keyInterpolateUnescaped: "replace this {{- value}}",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyInterpolateUnescaped: "replace this {{- value}}",
	});

	expect(imported.bundles[0]?.id).toStrictEqual("keyInterpolateUnescaped");
	expect(imported.bundles[0]?.declarations).toStrictEqual([
		{ type: "input-variable", name: "- value" },
	]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "replace this " },
		{
			type: "expression",
			arg: { type: "variable-reference", name: "- value" },
		},
	] satisfies Pattern);
});

test("keyInterpolateWithFormatting", async () => {
	const imported = await runImportFiles({
		keyInterpolateWithFormatting: "replace this {{value, format}}",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyInterpolateWithFormatting: "replace this {{value, format}}",
	});

	expect(imported.bundles[0]?.id).toStrictEqual("keyInterpolateWithFormatting");
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "replace this " },
		{
			type: "expression",
			arg: { type: "variable-reference", name: "value" },
			annotation: { type: "function-reference", name: "format", options: [] },
		},
	] satisfies Pattern);
});

test("keyMarkupTransTags", async () => {
	const imported = await runImportFiles({
		keyMarkupTransTags: "Click <link>here</link>.<icon/>",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyMarkupTransTags: "Click <link>here</link>.<icon/>",
	});

	expect(imported.bundles[0]?.declarations).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "Click " },
		{ type: "markup-start", name: "link" },
		{ type: "text", value: "here" },
		{ type: "markup-end", name: "link" },
		{ type: "text", value: "." },
		{ type: "markup-standalone", name: "icon" },
	] satisfies Pattern);
});

test("keyMarkupTransTagsWithInterpolation", async () => {
	const imported = await runImportFiles({
		keyMarkupTransTagsWithInterpolation: "Hello <b>{{name}}</b><icon/>",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyMarkupTransTagsWithInterpolation: "Hello <b>{{name}}</b><icon/>",
	});

	expect(imported.bundles[0]?.declarations).toStrictEqual([
		{ type: "input-variable", name: "name" },
	]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "Hello " },
		{ type: "markup-start", name: "b" },
		{ type: "expression", arg: { type: "variable-reference", name: "name" } },
		{ type: "markup-end", name: "b" },
		{ type: "markup-standalone", name: "icon" },
	] satisfies Pattern);
});

test("keyMarkupNumericTransTags", async () => {
	const imported = await runImportFiles({
		keyMarkupNumericTransTags: "Click <0>here</0>.<1/>",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyMarkupNumericTransTags: "Click <0>here</0>.<1/>",
	});

	expect(imported.bundles[0]?.declarations).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "Click " },
		{ type: "markup-start", name: "0" },
		{ type: "text", value: "here" },
		{ type: "markup-end", name: "0" },
		{ type: "text", value: "." },
		{ type: "markup-standalone", name: "1" },
	] satisfies Pattern);
});

test("keyMarkupMixedNamedAndNumericTransTags", async () => {
	const imported = await runImportFiles({
		keyMarkupMixedNamedAndNumericTransTags: "A <0>nested <b>tag</b></0> <icon/>",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyMarkupMixedNamedAndNumericTransTags: "A <0>nested <b>tag</b></0> <icon/>",
	});

	expect(imported.bundles[0]?.declarations).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "A " },
		{ type: "markup-start", name: "0" },
		{ type: "text", value: "nested " },
		{ type: "markup-start", name: "b" },
		{ type: "text", value: "tag" },
		{ type: "markup-end", name: "b" },
		{ type: "markup-end", name: "0" },
		{ type: "text", value: " " },
		{ type: "markup-standalone", name: "icon" },
	] satisfies Pattern);
});

// context keys, see https://www.i18next.com/translation-function/context
// reproduces https://github.com/opral/inlang/issues/4355
test("keyContext", async () => {
	const imported = await runImportFiles({
		// catch all
		keyContext: "the variant",
		// context: male
		keyContext_male: "the male variant",
		// context: female
		keyContext_female: "the female variant",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyContext: "the variant",
		keyContext_male: "the male variant",
		keyContext_female: "the female variant",
	});

	expect(imported.bundles).lengthOf(1);
	// one message per imported key, see
	// "a key with a single variant should have no matches even if other keys are multi variant"
	expect(imported.messages).lengthOf(3);
	expect(imported.variants).lengthOf(3);

	expect(imported.bundles[0]?.id).toStrictEqual("keyContext");
	expect(imported.bundles[0]?.declarations).toStrictEqual([
		{ type: "input-variable", name: "context" },
	]);

	// every message of the bundle declares the same selectors
	for (const message of imported.messages) {
		expect(message.selectors).toStrictEqual([
			{ type: "variable-reference", name: "context" },
		]);
	}

	// variants are ordered most-specific-first so that first-match-wins
	// consumers (e.g. the paraglide compiler) resolve context like i18next.
	// the base key is the fallback, expressed as a catchall match.
	// https://github.com/opral/inlang/issues/4354
	expect(imported.variants.map((variant) => variant.matches)).toStrictEqual([
		[{ type: "literal-match", key: "context", value: "male" }],
		[{ type: "literal-match", key: "context", value: "female" }],
		[{ type: "catchall-match", key: "context" }],
	]);
	expect(
		imported.variants.map((variant) =>
			variant.pattern?.[0]?.type === "text"
				? variant.pattern[0].value
				: undefined
		)
	).toStrictEqual(["the male variant", "the female variant", "the variant"]);
});

// context combined with plurals, mirrors the example in
// https://www.i18next.com/translation-function/context#combining-with-plurals
// reproduces https://github.com/opral/inlang/issues/4355
test("keyContextCombinedWithPlurals", async () => {
	// the context+plural keys mirror i18next's own test fixture in
	// test/runtime/translator/translator.translate.combination.test.js
	const json = {
		friend_one: "A friend",
		friend_other: "{{count}} friends",
		friend_male_zero: "No boyfriend",
		friend_male_one: "A boyfriend",
		friend_male_other: "{{count}} boyfriends",
		friend_female_zero: "no girlfriend",
		friend_female_one: "a girlfriend",
		friend_female_other: "{{count}} girlfriends",
	};
	const imported = await runImportFiles(json);
	expect(await runExportFilesParsed(imported)).toStrictEqual(json);

	expect(imported.bundles).lengthOf(1);
	expect(imported.bundles[0]?.id).toStrictEqual("friend");
	expect(imported.bundles[0]?.declarations).toStrictEqual(
		expect.arrayContaining([
			{ type: "input-variable", name: "context" },
			{ type: "input-variable", name: "count" },
		])
	);
	expect(imported.variants).lengthOf(8);
});

// a plural key set can ship a base key as the fallback for calls without a
// count, see https://www.i18next.com/translation-function/plurals
// reproduces https://github.com/opral/inlang/issues/4355
// ("The variant does not have a plural match")
test("keyPluralWithBaseKey", async () => {
	const json = {
		friend: "A friend",
		friend_one: "A friend",
		friend_other: "{{count}} friends",
	};
	const imported = await runImportFiles(json);
	expect(await runExportFilesParsed(imported)).toStrictEqual(json);
});

// reproduces https://github.com/opral/inlang/issues/4354 — imported variants
// must be ordered most-specific-first with explicit catchall matches so that
// first-match-wins consumers (e.g. the paraglide compiler) resolve a call
// like t("friend", { context: "male", count: 1 }) the way i18next does:
// `friend_male_one` > `friend_male` > `friend_one` > `friend`
// https://www.i18next.com/translation-function/context#combining-with-plurals
test("context and plural sibling keys are ordered most-specific-first with catchall fallbacks", async () => {
	const json = {
		friend: "A friend",
		friend_one: "A friend",
		friend_other: "{{count}} friends",
		friend_male: "A boyfriend",
		friend_male_one: "A boyfriend",
		friend_male_other: "{{count}} boyfriends",
	};
	const imported = await runImportFiles(json);

	// round-trips unchanged
	expect(await runExportFilesParsed(imported)).toStrictEqual(json);

	expect(imported.bundles).lengthOf(1);
	expect(imported.bundles[0]?.declarations).toStrictEqual(
		expect.arrayContaining([
			{ type: "input-variable", name: "context" },
			{ type: "input-variable", name: "count" },
		])
	);

	// every message of the bundle declares the same selectors
	for (const message of imported.messages) {
		expect(message.selectors).toStrictEqual([
			{ type: "variable-reference", name: "context" },
			{ type: "variable-reference", name: "countPlural" },
		]);
	}

	expect(imported.variants.map((variant) => variant.matches)).toStrictEqual([
		[
			{ type: "literal-match", key: "context", value: "male" },
			{ type: "literal-match", key: "countPlural", value: "one" },
		],
		[
			{ type: "literal-match", key: "context", value: "male" },
			{ type: "literal-match", key: "countPlural", value: "other" },
		],
		[
			{ type: "literal-match", key: "context", value: "male" },
			{ type: "catchall-match", key: "countPlural" },
		],
		[
			{ type: "catchall-match", key: "context" },
			{ type: "literal-match", key: "countPlural", value: "one" },
		],
		[
			{ type: "catchall-match", key: "context" },
			{ type: "literal-match", key: "countPlural", value: "other" },
		],
		[
			{ type: "catchall-match", key: "context" },
			{ type: "catchall-match", key: "countPlural" },
		],
	]);
});

test("keyPluralSimple", async () => {
	const imported = await runImportFiles({
		keyPluralSimple_one: "the singular",
		keyPluralSimple_other: "the plural",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyPluralSimple_one: "the singular",
		keyPluralSimple_other: "the plural",
	});

	expect(imported.bundles[0]?.id).toStrictEqual("keyPluralSimple");

	expect(imported.bundles[0]?.declarations).toStrictEqual(
		expect.arrayContaining([
			{
				type: "input-variable",
				name: "count",
			},
			expect.objectContaining({
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
			}),
		])
	);

	expect(imported?.messages[0]?.selectors).toStrictEqual([
		{
			type: "variable-reference",
			name: "countPlural",
		},
	]);

	expect(imported?.variants[0]).toStrictEqual(
		expect.objectContaining({
			matches: [
				{
					type: "literal-match",
					key: "countPlural",
					value: "one",
				},
			],
			pattern: [{ type: "text", value: "the singular" }],
		} satisfies Partial<Variant>)
	);

	expect(imported?.variants[1]).toStrictEqual(
		expect.objectContaining({
			matches: [
				{
					type: "literal-match",
					key: "countPlural",
					value: "other",
				},
			],
			pattern: [{ type: "text", value: "the plural" }],
		} satisfies Partial<Variant>)
	);
});

test("keyPluralMultipleEgArabic", async () => {
	const imported = await runImportFiles({
		keyPluralMultipleEgArabic_zero: "the plural form 0",
		keyPluralMultipleEgArabic_one: "the plural form 1",
		keyPluralMultipleEgArabic_two: "the plural form 2",
		keyPluralMultipleEgArabic_few: "the plural form 3",
		keyPluralMultipleEgArabic_many: "the plural form 4",
		keyPluralMultipleEgArabic_other: "the plural form 5",
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyPluralMultipleEgArabic_zero: "the plural form 0",
		keyPluralMultipleEgArabic_one: "the plural form 1",
		keyPluralMultipleEgArabic_two: "the plural form 2",
		keyPluralMultipleEgArabic_few: "the plural form 3",
		keyPluralMultipleEgArabic_many: "the plural form 4",
		keyPluralMultipleEgArabic_other: "the plural form 5",
	});

	expect(imported.bundles[0]?.id).toStrictEqual("keyPluralMultipleEgArabic");

	expect(imported?.messages[0]?.selectors).toStrictEqual([
		{ type: "variable-reference", name: "countPlural" },
	]);

	expect(imported.bundles[0]?.declarations).toStrictEqual(
		expect.arrayContaining([
			{
				type: "input-variable",
				name: "count",
			},
			expect.objectContaining({
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
			}),
		])
	);

	const matches = imported.variants.map(
		(variant) => (variant.matches?.[0] as LiteralMatch).value
	);

	expect(matches).toStrictEqual(["zero", "one", "two", "few", "many", "other"]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "the plural form 0" },
	]);
	expect(imported.variants[1]?.pattern).toStrictEqual([
		{ type: "text", value: "the plural form 1" },
	]);
	expect(imported.variants[2]?.pattern).toStrictEqual([
		{ type: "text", value: "the plural form 2" },
	]);
	expect(imported.variants[3]?.pattern).toStrictEqual([
		{ type: "text", value: "the plural form 3" },
	]);
	expect(imported.variants[4]?.pattern).toStrictEqual([
		{ type: "text", value: "the plural form 4" },
	]);
	expect(imported.variants[5]?.pattern).toStrictEqual([
		{ type: "text", value: "the plural form 5" },
	]);
});

test("keyWithObjectValue", async () => {
	const imported = await runImportFiles({
		keyWithObjectValue: {
			valueA: "return this with valueB",
			valueB: "more text",
		},
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyWithObjectValue: {
			valueA: "return this with valueB",
			valueB: "more text",
		},
	});

	expect(imported.bundles[0]?.id).toStrictEqual("keyWithObjectValue.valueA");
	expect(imported.bundles[1]?.id).toStrictEqual("keyWithObjectValue.valueB");

	expect(
		imported.variants.find(
			(v) => v.messageBundleId === "keyWithObjectValue.valueA"
		)?.pattern
	).toStrictEqual([
		{ type: "text", value: "return this with valueB" },
	] satisfies Pattern);
	expect(
		imported.variants.find(
			(v) => v.messageBundleId === "keyWithObjectValue.valueB"
		)?.pattern
	).toStrictEqual([{ type: "text", value: "more text" }] satisfies Pattern);
});

test("keyWithArrayValue", async () => {
	const imported = await runImportFiles({
		keyWithArrayValue: ["multiple", "things"],
	});
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		keyWithArrayValue: ["multiple", "things"],
	});

	expect(imported.bundles[0]?.id).toStrictEqual("keyWithArrayValue.0");
	expect(imported.bundles[1]?.id).toStrictEqual("keyWithArrayValue.1");

	expect(
		imported.variants.find((v) => v.messageBundleId === "keyWithArrayValue.0")
			?.pattern
	).toStrictEqual([{ type: "text", value: "multiple" }] satisfies Pattern);
	expect(
		imported.variants.find((v) => v.messageBundleId === "keyWithArrayValue.1")
			?.pattern
	).toStrictEqual([{ type: "text", value: "things" }] satisfies Pattern);
});

test("im- and exporting multiple files should succeed", async () => {
	const en = {
		key: "value",
	};
	const de = {
		key: "Wert",
	};

	const imported = await importFiles({
		settings: {} as any,
		files: [
			{
				locale: "en",
				content: new TextEncoder().encode(JSON.stringify(en)),
			},
			{
				locale: "de",
				content: new TextEncoder().encode(JSON.stringify(de)),
			},
		],
	});

	const exported = await runExportFiles(imported);

	const exportedEn = JSON.parse(
		new TextDecoder().decode(exported.find((e) => e.locale === "en")?.content)
	);
	const exportedDe = JSON.parse(
		new TextDecoder().decode(exported.find((e) => e.locale === "de")?.content)
	);

	expect(exportedEn).toStrictEqual({
		key: "value",
	});
	expect(exportedDe).toStrictEqual({
		key: "Wert",
	});
});

test("it should handle namespaces", async () => {
	const enCommon = {
		confirm: "value1",
	};
	const enLogin = {
		button: "value2",
	};

	const imported = await importFiles({
		settings: {} as any,
		files: [
			{
				locale: "en",
				content: new TextEncoder().encode(JSON.stringify(enCommon)),
				toBeImportedFilesMetadata: {
					namespace: "common",
				},
			},
			{
				locale: "en",
				content: new TextEncoder().encode(JSON.stringify(enLogin)),
				toBeImportedFilesMetadata: {
					namespace: "login",
				},
			},
		],
	});
	const exported = await runExportFiles(imported);

	const exportedCommon = JSON.parse(
		new TextDecoder().decode(
			exported.find((e) => e.name === "common-en.json")?.content
		)
	);
	const exportedLogin = JSON.parse(
		new TextDecoder().decode(
			exported.find((e) => e.name === "login-en.json")?.content
		)
	);

	expect(exportedCommon).toStrictEqual({
		confirm: "value1",
	});
	expect(exportedLogin).toStrictEqual({
		button: "value2",
	});
});

test("it should put new entities into the file without a namespace", async () => {
	const enNoNamespace = {
		blue_box: "value1",
	};

	const enCommon = {
		foo_bar: "value2",
	};

	const imported = await importFiles({
		settings: {} as any,
		files: [
			{
				locale: "en",
				content: new TextEncoder().encode(JSON.stringify(enNoNamespace)),
			},
			{
				locale: "en",
				content: new TextEncoder().encode(JSON.stringify(enCommon)),
				toBeImportedFilesMetadata: {
					namespace: "common",
				},
			},
		],
	});

	const newBundle: Bundle = {
		id: "new_bundle",
		declarations: [],
	};

	const newMessage: Message = {
		id: "mock-29jas",
		bundleId: "new_bundle",
		locale: "en",
		selectors: [],
	};

	const newVariant: Variant = {
		id: "mock-111sss",
		matches: [],
		messageId: "mock-29jas",
		pattern: [{ type: "text", value: "elephant" }],
	};

	const exported = await runExportFiles({
		bundles: [...imported.bundles, newBundle],
		messages: [...imported.messages, newMessage],
		variants: [...imported.variants, newVariant],
	});

	const exportedNoNamespace = JSON.parse(
		new TextDecoder().decode(
			exported.find((e) => e.name === "en.json")?.content
		)
	);

	const exportedCommon = JSON.parse(
		new TextDecoder().decode(
			exported.find((e) => e.name === "common-en.json")?.content
		)
	);

	expect(exportedNoNamespace).toStrictEqual({
		blue_box: "value1",
		new_bundle: "elephant",
	});

	expect(exportedCommon).toStrictEqual({
		foo_bar: "value2",
	});
});

test("a key with a single variant should have no matches even if other keys are multi variant", async () => {
	const imported = await runImportFiles({
		key: "value",
		keyPluralSimple_one: "the singular",
		keyPluralSimple_other: "the plural",
	});

	expect(await runExportFilesParsed(imported)).toStrictEqual({
		key: "value",
		keyPluralSimple_one: "the singular",
		keyPluralSimple_other: "the plural",
	});

	expect(imported.bundles).lengthOf(2);
	expect(imported.messages).lengthOf(3);
	expect(imported.variants).lengthOf(3);

	expect(imported.bundles[0]?.id).toStrictEqual("key");

	expect(imported.messages[0]?.selectors).toStrictEqual([]);
	expect(imported.variants[0]?.matches).toStrictEqual([]);
	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "value" },
	]);
});

// https://github.com/opral/inlang-paraglide-js/issues/513
test("custom variable reference patterns can be provided", async () => {
	const settings = {
		"plugin.inlang.i18next": {
			variableReferencePattern: ["<", ">"],
		},
	};

	const imported = await runImportFiles(
		{
			blue: "blue {{blue}}",
			red: "red <red>",
		},
		settings
	);

	expect(imported.variants[0]?.pattern).toStrictEqual([
		{ type: "text", value: "blue {{blue}}" },
	] satisfies Pattern);
	expect(imported.variants[1]?.pattern).toStrictEqual([
		{ type: "text", value: "red " },
		{ type: "expression", arg: { type: "variable-reference", name: "red" } },
	] satisfies Pattern);

	expect(await runExportFilesParsed(imported, settings)).toStrictEqual({
		blue: "blue {{blue}}",
		red: "red <red>",
	});
});

test("markup conflicts with angle bracket variable reference pattern", async () => {
	const settings = {
		"plugin.inlang.i18next": {
			variableReferencePattern: ["<", ">"],
		},
	};

	const imported = {
		bundles: [{ id: "rich", declarations: [] }],
		messages: [
			{
				id: "rich-en",
				bundleId: "rich",
				locale: "en",
				selectors: [],
			},
		],
		variants: [
			{
				id: "rich-en-default",
				messageId: "rich-en",
				matches: [],
				pattern: [
					{ type: "text", value: "Click " },
					{ type: "markup-start", name: "link" },
					{ type: "text", value: "here" },
					{ type: "markup-end", name: "link" },
				],
			},
		],
	};

	await expect(runExportFiles(imported as any, settings)).rejects.toThrow(
		"Cannot serialize markup when variableReferencePattern is '<' and '>' because both syntaxes would conflict."
	);
});

// convenience wrapper for less testing code
function runImportFiles(json: Record<string, any>, settings?: any) {
	return importFiles({
		settings: settings ?? {},
		files: [
			{
				locale: "en",
				content: new TextEncoder().encode(JSON.stringify(json)),
			},
		],
	});
}

// convenience wrapper for less testing code
async function runExportFiles(
	imported: Awaited<ReturnType<typeof importFiles>>,
	settings?: any
) {
	// add ids which are undefined from the import
	for (const message of imported.messages) {
		if (message.id === undefined) {
			message.id = `${Math.random() * 1000}`;
		}
	}
	for (const variant of imported.variants) {
		if (variant.id === undefined) {
			// @ts-expect-error - variant is an VariantImport
			variant.id = `${Math.random() * 1000}`;
		}
		if (variant.messageId === undefined) {
			// @ts-expect-error - variant is an VariantImport
			variant.messageId = imported.messages.find(
				(m: any) =>
					m.bundleId === variant.messageBundleId &&
					m.locale === variant.messageLocale
			)?.id;
		}
	}

	const exported = await exportFiles({
		settings: settings ?? {},
		bundles: imported.bundles as Bundle[],
		messages: imported.messages as Message[],
		variants: imported.variants as Variant[],
	});
	return exported;
}

// convenience wrapper for less testing code
async function runExportFilesParsed(imported: any, settings?: any) {
	const exported = await runExportFiles(imported, settings);
	return JSON.parse(new TextDecoder().decode(exported[0]?.content));
}
