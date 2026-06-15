import { expect, test } from "vitest";
import { toBeImportedFiles } from "./toBeImportedFiles.js";
import type { PluginSettings } from "../settings.js";

test("returns files for a single path pattern", async () => {
	const result = await toBeImportedFiles({
		settings: {
			baseLocale: "en",
			locales: ["en", "de"],
			"plugin.inlang.nextIntl": {
				pathPattern: "/messages/{locale}.json",
			},
		} as any,
	});

	expect(result).toEqual([
		{
			locale: "en",
			path: "/messages/en.json",
		},
		{
			locale: "de",
			path: "/messages/de.json",
		},
	]);
});

test("returns files for namespace path patterns", async () => {
	const result = await toBeImportedFiles({
		settings: {
			baseLocale: "en",
			locales: ["en", "de"],
			"plugin.inlang.nextIntl": {
				pathPattern: {
					About: "/messages/{locale}/About.json",
					HomePage: "/messages/HomePage/{languageTag}.json",
				},
			} satisfies PluginSettings,
		} as any,
	});

	expect(result).toEqual(
		expect.arrayContaining([
			{
				locale: "en",
				path: "/messages/en/About.json",
				metadata: {
					namespace: "About",
				},
			},
			{
				locale: "de",
				path: "/messages/de/About.json",
				metadata: {
					namespace: "About",
				},
			},
			{
				locale: "en",
				path: "/messages/HomePage/en.json",
				metadata: {
					namespace: "HomePage",
				},
			},
			{
				locale: "de",
				path: "/messages/HomePage/de.json",
				metadata: {
					namespace: "HomePage",
				},
			},
		])
	);
});

test("uses sourceLanguageFilePath for the source locale", async () => {
	const result = await toBeImportedFiles({
		settings: {
			baseLocale: "en",
			locales: ["en", "de"],
			"plugin.inlang.nextIntl": {
				pathPattern: "/messages/{locale}.json",
				sourceLanguageFilePath: "/messages/main.json",
			},
		} as any,
	});

	expect(result).toEqual([
		{
			locale: "en",
			path: "/messages/main.json",
		},
		{
			locale: "de",
			path: "/messages/de.json",
		},
	]);
});

test("returns [] if the pathPattern is not provided", async () => {
	const result = await toBeImportedFiles({
		settings: {
			baseLocale: "en",
			locales: ["en", "de"],
			"plugin.inlang.nextIntl": {
				"some-other-prop": "value",
			},
		} as any,
	});

	expect(result).toEqual([]);
});
