/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "vitest";
// import { Message, ProjectSettings, Variant, createVariant, getVariant } from "@inlang/sdk"
import { plugin } from "./plugin.js";
// import { createNodeishMemoryFs } from "@lix-js/fs"
import { Value } from "@sinclair/typebox/value";

// const pluginId = "plugin.inlang.json"

test("valid path patterns", async () => {
	const validPathPatterns = [
		"/folder/{languageTag}.json",
		"/folder/{locale}.json",
		"./{languageTag}/file.json",
		"./{locale}/file.json",
		"../folder/{languageTag}/file.json",
		"./{languageTag}.json",
		"./{languageTag}/folder/file.json",
	];

	for (const pathPattern of validPathPatterns) {
		const isValid = Value.Check(plugin.settingsSchema!, {
			pathPattern,
		});
		expect(isValid).toBe(true);
	}
});

test("it should fail if the path pattern does not start as a ralaitve path with a /,./ or ../", async () => {
	const pathPattern = "{languageTag}.json";

	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(false);
});

test("if pathPattern with namespaces includes the correct pathpattern schema", async () => {
	const pathPattern = {
		About: "./{languageTag}/About.json",
		HomePage: "./{locale}/HomePage.json",
	};

	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(true);
});

test("if pathPattern with namespaces includes an incorrect pathpattern", async () => {
	const pathPattern = {
		About: "./About.json",
	};

	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(false);
});

test("sourceLanguageFilePath accepts a fixed source file path", async () => {
	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern: "./{locale}.json",
		sourceLanguageFilePath: "./resources/main.json",
	});
	expect(isValid).toBe(true);
});

test("sourceLanguageFilePath rejects files that do not end with json", async () => {
	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern: "./{locale}.json",
		sourceLanguageFilePath: "./resources/main.txt",
	});
	expect(isValid).toBe(false);
});

test("if path patter does include the word `{languageTag}`", async () => {
	const pathPattern = "./examplePath.json";

	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(false);
});
test("if path patte end with .json", async () => {
	const pathPattern = "./{languageTag}.";

	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(false);
});
test("if curly brackets {} does to cointain the word languageTag", async () => {
	const pathPattern = "./{en}.json";

	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(false);
});
test("if pathPattern doesn't includes a '*' wildcard. This was deprecated in version 3.0.0.", async () => {
	const pathPattern = "./{languageTag}/*.json";
	const isValid = Value.Check(plugin.settingsSchema!, {
		pathPattern,
	});
	expect(isValid).toBe(false);
});
