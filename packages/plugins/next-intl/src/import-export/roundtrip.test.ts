import { expect, test } from "vitest";
import { importFiles } from "./importFiles.js";
import { exportFiles } from "./exportFiles.js";

test("imports and exports a single next-intl file", async () => {
	const imported = await runImportFiles({
		title: "Hello {name}",
		nested: {
			body: "Welcome",
		},
	});

	expect(imported.bundles.map((bundle) => bundle.id)).toEqual([
		"title",
		"nested.body",
	]);
	expect(imported.variants[0]?.pattern).toEqual([
		{ type: "text", value: "Hello " },
		{ type: "expression", arg: { type: "variable-reference", name: "name" } },
	]);

	const exported = await runExportFilesParsed(imported);

	expect(exported).toStrictEqual({
		title: "Hello {name}",
		nested: {
			body: "Welcome",
		},
	});
});

test("imports and exports flat dotted keys without nesting them", async () => {
	const imported = await runImportFiles({
		"test.test": "Flat dotted key",
	});

	expect(imported.bundles.map((bundle) => bundle.id)).toEqual(["test.test"]);
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		"test.test": "Flat dotted key",
	});
});

test("exports newly-created flat dotted keys without nesting them", async () => {
	const exported = await exportFiles({
		settings: {} as any,
		bundles: [{ id: "test.test" }] as any,
		messages: [
			{
				id: "message-1",
				bundleId: "test.test",
				locale: "en",
				selectors: [],
			},
		] as any,
		variants: [
			{
				id: "variant-1",
				messageId: "message-1",
				pattern: [{ type: "text", value: "Flat dotted key" }],
			},
		] as any,
	});

	expect(JSON.parse(new TextDecoder().decode(exported[0]?.content))).toEqual({
		"test.test": "Flat dotted key",
	});
});

test("skips empty objects while importing", async () => {
	const imported = await runImportFiles({
		a: {
			b: {},
		},
		title: "Hello",
	});

	expect(imported.bundles.map((bundle) => bundle.id)).toEqual(["title"]);
	expect(await runExportFilesParsed(imported)).toStrictEqual({
		title: "Hello",
	});
});

test("imports and exports namespace files", async () => {
	const imported = await importFiles({
		settings: {
			"plugin.inlang.nextIntl": {
				pathPattern: {
					About: "./messages/{locale}/About.json",
					HomePage: "./messages/{locale}/HomePage.json",
				},
			},
		} as any,
		files: [
			{
				locale: "en",
				content: new TextEncoder().encode(
					JSON.stringify({ title: "About us" })
				),
				toBeImportedFilesMetadata: {
					namespace: "About",
				},
			},
			{
				locale: "en",
				content: new TextEncoder().encode(
					JSON.stringify({ hero: { title: "Welcome" } })
				),
				toBeImportedFilesMetadata: {
					namespace: "HomePage",
				},
			},
		],
	});

	expect(imported.bundles.map((bundle) => bundle.id)).toEqual([
		"About.title",
		"HomePage.hero.title",
	]);

	const exported = await runExportFiles(imported, {
		"plugin.inlang.nextIntl": {
			pathPattern: {
				About: "./messages/{locale}/About.json",
				HomePage: "./messages/{locale}/HomePage.json",
			},
		},
	});
	const exportedAbout = exported.find((file) => file.name === "About-en.json");
	const exportedHomePage = exported.find(
		(file) => file.name === "HomePage-en.json"
	);

	expect(
		JSON.parse(new TextDecoder().decode(exportedAbout?.content))
	).toStrictEqual({
		title: "About us",
	});
	expect(
		JSON.parse(new TextDecoder().decode(exportedHomePage?.content))
	).toStrictEqual({
		hero: {
			title: "Welcome",
		},
	});
	expect((exportedAbout as any)?.metadata).toStrictEqual({
		namespace: "About",
	});
	expect((exportedHomePage as any)?.metadata).toStrictEqual({
		namespace: "HomePage",
	});
});

test("exports sourceLanguageFilePath metadata for the SDK writer", async () => {
	const settings = {
		baseLocale: "en",
		locales: ["en", "de"],
		"plugin.inlang.nextIntl": {
			pathPattern: "./messages/{locale}.json",
			sourceLanguageFilePath: "./messages/main.json",
		},
	};
	const exported = await exportFiles({
		settings: settings as any,
		bundles: [{ id: "title" }] as any,
		messages: [
			{
				id: "message-1",
				bundleId: "title",
				locale: "en",
				selectors: [],
			},
			{
				id: "message-2",
				bundleId: "title",
				locale: "de",
				selectors: [],
			},
		] as any,
		variants: [
			{
				id: "variant-1",
				messageId: "message-1",
				pattern: [{ type: "text", value: "Hello" }],
			},
			{
				id: "variant-2",
				messageId: "message-2",
				pattern: [{ type: "text", value: "Hallo" }],
			},
		] as any,
	});
	const sourceFile = (exported as any[]).find((file) => file.locale === "en");
	const targetFile = (exported as any[]).find((file) => file.locale === "de");

	expect(sourceFile?.metadata?.pathPattern).toBe("./messages/main.json");
	expect(targetFile?.metadata?.pathPattern).toBeUndefined();
	expect(settings["plugin.inlang.nextIntl"].pathPattern).toBe(
		"./messages/{locale}.json"
	);
});

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

async function runExportFiles(
	imported: Awaited<ReturnType<typeof importFiles>>,
	settings?: any
) {
	for (const [index, message] of imported.messages.entries()) {
		(message as any).id ??= `message-${index}`;
	}
	for (const [index, variant] of imported.variants.entries()) {
		(variant as any).id ??= `variant-${index}`;
		(variant as any).messageId ??= imported.messages.find(
			(message) =>
				message.bundleId === variant.messageBundleId &&
				message.locale === variant.messageLocale
		)?.id;
	}

	return exportFiles({
		settings: settings ?? {},
		bundles: imported.bundles as any,
		messages: imported.messages as any,
		variants: imported.variants as any,
	});
}

async function runExportFilesParsed(
	imported: Awaited<ReturnType<typeof importFiles>>,
	settings?: any
) {
	const exported = await runExportFiles(imported, settings);
	return JSON.parse(new TextDecoder().decode(exported[0]?.content));
}
