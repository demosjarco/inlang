import type {
	InlangPlugin,
	MessageImport,
	Pattern,
	VariantImport,
} from "@inlang/sdk";
import type { PluginSettings } from "../settings.js";
import { PLUGIN_KEY } from "../pluginKey.js";
import { createMessageId, createVariantId } from "./messageId.js";

type JsonPlugin = InlangPlugin<{ [PLUGIN_KEY]: PluginSettings }>;
type InputDeclaration = { type: "input-variable"; name: string };
type JsonBundleImport = { id: string; declarations: InputDeclaration[] };
type VariableReferenceExpression = Extract<
	Pattern[number],
	{ type: "expression" }
> & {
	arg: { type: "variable-reference"; name: string };
};

export const importFiles: NonNullable<JsonPlugin["importFiles"]> = async ({
	files,
	settings,
}) => {
	const bundles = new Map<string, JsonBundleImport>();
	const messages: MessageImport[] = [];
	const variants: VariantImport[] = [];
	const variableReferencePattern = settings[PLUGIN_KEY]
		?.variableReferencePattern ?? ["{", "}"];

	for (const file of files) {
		const namespace = file.toBeImportedFilesMetadata?.namespace;
		const resource = flattenMessages(
			JSON.parse(new TextDecoder().decode(file.content))
		);

		for (const { key, path, value } of resource) {
			const bundleId = namespace ? `${namespace}:${key}` : key;
			const pattern = parsePattern(value, variableReferencePattern);
			const declarations = uniqueDeclarations(
				pattern.filter(isVariableReferenceExpression).map((part) => ({
					type: "input-variable" as const,
					name: part.arg.name,
				}))
			);
			const existingBundle = bundles.get(bundleId);

			if (existingBundle === undefined) {
				bundles.set(bundleId, { id: bundleId, declarations });
			} else {
				existingBundle.declarations = uniqueDeclarations([
					...existingBundle.declarations,
					...declarations,
				]);
			}

			const messageId = createMessageId({
				locale: file.locale,
				bundleId,
				path,
			});

			messages.push({
				id: messageId,
				bundleId,
				locale: file.locale,
				selectors: [],
			});
			variants.push({
				id: createVariantId(messageId),
				messageId,
				matches: [],
				pattern,
			});
		}
	}

	return {
		bundles: Array.from(bundles.values()),
		messages,
		variants,
	};
};

function flattenMessages(json: unknown): Array<{
	key: string;
	path: string[];
	value: string;
}> {
	const result: Array<{ key: string; path: string[]; value: string }> = [];

	function visit(value: unknown, path: string[]) {
		if (typeof value === "string") {
			if (path.length > 0) {
				result.push({ key: path.join("."), path, value });
			}
			return;
		}

		if (
			value !== null &&
			typeof value === "object" &&
			Array.isArray(value) === false
		) {
			for (const [key, nestedValue] of Object.entries(value)) {
				visit(nestedValue, [...path, key]);
			}
		}
	}

	visit(json, []);
	return result;
}

function parsePattern(
	text: string,
	variableReferencePattern: string[]
): Pattern {
	const opening = variableReferencePattern[0] || "{";
	const closing = variableReferencePattern[1] ?? "";
	const expression = closing
		? new RegExp(
				`(${escapeRegExp(opening)}[\\s\\S]+?${escapeRegExp(closing)})`,
				"g"
			)
		: new RegExp(`(${escapeRegExp(opening)}\\w+)`, "g");

	return text
		.split(expression)
		.filter((element) => element !== "")
		.map((element) => {
			if (isVariableReference(element, opening, closing)) {
				return {
					type: "expression" as const,
					arg: {
						type: "variable-reference" as const,
						name: closing
							? element.slice(opening.length, -closing.length)
							: element.slice(opening.length),
					},
				};
			}
			return { type: "text" as const, value: element };
		});
}

function isVariableReference(
	text: string,
	opening: string,
	closing: string
): boolean {
	return closing
		? text.startsWith(opening) &&
				text.endsWith(closing) &&
				text.length > opening.length + closing.length
		: text.startsWith(opening) && text.length > opening.length;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isVariableReferenceExpression(
	part: Pattern[number]
): part is VariableReferenceExpression {
	return part.type === "expression" && part.arg.type === "variable-reference";
}

function uniqueDeclarations(
	declarations: InputDeclaration[]
): InputDeclaration[] {
	const result = new Map<string, InputDeclaration>();
	for (const declaration of declarations) {
		result.set(`${declaration.type}:${declaration.name}`, declaration);
	}
	return Array.from(result.values());
}
