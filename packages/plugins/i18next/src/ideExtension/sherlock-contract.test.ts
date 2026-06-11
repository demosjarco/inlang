import { expect, test } from "vitest";
import type { ProjectSettings } from "@inlang/sdk";
import { plugin } from "../plugin.js";

// Sherlock obtains the ide-extension api via `plugin.meta` and only migrates
// `plugin.addCustomApi({ settings })` into `meta` when `meta` is NOT already
// set (state.ts: `if (plugin.addCustomApi && !plugin.meta)`):
// https://github.com/opral/sherlock/blob/1bb8b6477/src/utilities/state.ts
// It then invokes the matchers WITHOUT per-call settings and calls the
// extraction callback with `bundleId`:
// https://github.com/opral/sherlock/blob/1bb8b6477/src/decorations/messagePreview.ts
// https://github.com/opral/sherlock/blob/1bb8b6477/src/commands/extractMessage.ts
//
// A static `meta` whose matchers require `args.settings` therefore yields
// zero matches in Sherlock (the parse error is swallowed by a catch), which
// disables inline annotations, hovers, and extraction for i18next projects.
// reproduces https://github.com/opral/inlang/issues/4368

/** The subset of the ide-extension contract exercised by Sherlock. */
type IdeExtensionApi = {
	"app.inlang.ideExtension": {
		messageReferenceMatchers: Array<
			(args: { documentText: string }) => Promise<Array<{ messageId: string }>>
		>;
		extractMessageOptions: Array<{
			callback: (args: { bundleId: string; selection: string }) => {
				bundleId?: string;
				messageId?: string;
				messageReplacement: string;
			};
		}>;
	};
};

const settings = {
	baseLocale: "en",
	locales: ["en", "de"],
	"plugin.inlang.i18next": {
		pathPattern: { common: "./locales/{locale}/common.json" },
	},
} satisfies ProjectSettings;

// mirror Sherlock's migration gate exactly
const meta = (
	plugin.addCustomApi && !plugin.meta
		? plugin.addCustomApi({ settings })
		: plugin.meta
) as IdeExtensionApi;

test("ide-extension matchers work through Sherlock's plugin.meta contract", async () => {
	const matcher = meta["app.inlang.ideExtension"].messageReferenceMatchers[0]!;

	// Sherlock calls matchers with documentText only (no settings)
	const matches = await matcher({
		documentText: [
			"const { t } = useTranslation('common')",
			"t('welcome')",
			"t('common:checkout')",
		].join("\n"),
	});

	expect(matches.map((match) => match.messageId)).toStrictEqual([
		"common:welcome",
		"common:checkout",
	]);
});

test("extraction callback supports Sherlock's bundleId contract", () => {
	const option = meta["app.inlang.ideExtension"].extractMessageOptions[0]!;

	// Sherlock's extract command calls the callback with `bundleId`
	const result = option.callback({
		bundleId: "common:checkout",
		selection: "Proceed",
	});

	expect(result.messageReplacement).toBe('{t("common:checkout")}');
	expect(result.bundleId).toBe("common:checkout");
});
