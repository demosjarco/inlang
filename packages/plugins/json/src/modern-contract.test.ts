import { expect, test } from "vitest";
import { plugin } from "./plugin.js";

test("retains legacy callbacks alongside the modern resource-plugin contract", () => {
	expect(plugin.id).toBe("plugin.inlang.json");
	expect(plugin.key).toBe("plugin.inlang.json");
	expect(plugin.loadMessages).toBeTypeOf("function");
	expect(plugin.saveMessages).toBeTypeOf("function");
	expect(plugin.toBeImportedFiles).toBeTypeOf("function");
	expect(plugin.importFiles).toBeTypeOf("function");
	expect(plugin.exportFiles).toBeTypeOf("function");
});
