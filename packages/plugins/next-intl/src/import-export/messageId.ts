const MESSAGE_ID_PREFIX = "plugin.inlang.nextIntl:";

export function createMessageId(args: {
	locale: string;
	bundleId: string;
	path: string[];
}): string {
	return `${MESSAGE_ID_PREFIX}${encodeURIComponent(JSON.stringify(args))}`;
}

export function getMessagePath(messageId: string): string[] | undefined {
	if (messageId.startsWith(MESSAGE_ID_PREFIX) === false) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(
			decodeURIComponent(messageId.slice(MESSAGE_ID_PREFIX.length))
		);
		return Array.isArray(parsed.path) &&
			parsed.path.every((segment: unknown) => typeof segment === "string")
			? parsed.path
			: undefined;
	} catch {
		return undefined;
	}
}
