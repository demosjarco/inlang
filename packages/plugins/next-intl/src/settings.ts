// Settings for next-intl plugin
import { Type, type Static } from "@sinclair/typebox";
const PathPattern = Type.String({
	pattern: "^(\\./|\\../|/)[^*]*\\{(languageTag|locale)\\}[^*]*\\.json",
	title: "Path to language files",
	description:
		"Specify the pathPattern to locate language files in your repository. It must include `{locale}` or legacy `{languageTag}` and end with `.json`.",
	examples: [
		"./{locale}/file.json",
		"../folder/{locale}/file.json",
		"./{locale}.json",
	],
});
const SourceLanguageFilePath = Type.String({
	pattern: "^(\\./|\\../|/)[^*]*\\.json$",
	title: "Path to source language file",
	description:
		"Specify the sourceLanguageFilePath if the source language file does not match pathPattern. It must end with `.json`.",
	examples: ["./resources/main.json"],
});
const NamespacePathPattern = Type.Record(
	Type.String({
		description: "The next-intl namespace.",
		examples: ["website", "app", "auth.SignUp"],
	}),
	PathPattern
);

export type PluginSettings = Static<typeof PluginSettings>;
export const PluginSettings = Type.Object({
	pathPattern: Type.Union([PathPattern, NamespacePathPattern]),
	variableReferencePattern: Type.Optional(
		Type.Array(Type.String(), {
			title: "Variable reference pattern",
			description:
				"The pattern to match content in the messages. You can define an opening and closing pattern. The closing pattern is not required. The default is '{{' and '}}'.",
			examples: ["{ and }", "{{ and }}", "< and >", "@:"],
		})
	),
	sourceLanguageFilePath: Type.Optional(SourceLanguageFilePath),
	ignore: Type.Optional(
		Type.Array(Type.String(), {
			title: "Ignore paths",
			description: "Set a path that should be ignored.",
		})
	),
});
