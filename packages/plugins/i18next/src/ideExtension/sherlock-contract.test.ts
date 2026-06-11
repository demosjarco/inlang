import { expect, test } from "vitest";
import { plugin } from "../plugin.js";

// Sherlock obtains the ide-extension api via `plugin.meta` and only migrates
// `plugin.addCustomApi({ settings })` into `meta` when `meta` is NOT already
// set (state.ts: `if (plugin.addCustomApi && !plugin.meta)`):
// https://github.com/opral/sherlock/blob/1bb8b6477/src/utilities/state.ts
// It then invokes the matchers WITHOUT per-call settings:
// https://github.com/opral/sherlock/blob/1bb8b6477/src/decorations/messagePreview.ts
//
// A static `meta` whose matchers require `args.settings` therefore yields
// zero matches in Sherlock (the parse error is swallowed by a catch), which
// disables inline annotations, hovers, and extraction for i18next projects.
// reproduces https://github.com/opral/inlang/issues/4368
test("ide-extension matchers work through Sherlock's plugin.meta contract", async () => {
	const settings = {
		baseLocale: "en",
		locales: ["en", "de"],
		"plugin.inlang.i18next": {
			pathPattern: { common: "./locales/{locale}/common.json" },
		},
	};

	// mirror Sherlock's migration gate exactly
	const meta =
		plugin.addCustomApi && !plugin.meta
			? (plugin.addCustomApi({ settings }) as Record<string, any>)
			: (plugin.meta as Record<string, any>);

	const matcher = meta["app.inlang.ideExtension"].messageReferenceMatchers[0];

	// Sherlock calls matchers with documentText only (no settings)
	const matches = await matcher({
		documentText: [
			"const { t } = useTranslation('common')",
			"t('welcome')",
			"t('common:checkout')",
		].join("\n"),
	});

	expect(matches.map((match: { messageId: string }) => match.messageId)).toStrictEqual([
		"common:welcome",
		"common:checkout",
	]);
});
