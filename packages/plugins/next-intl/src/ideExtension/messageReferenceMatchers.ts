import type { PluginSettings } from "../settings.js";

type Binding = {
	name: string;
	declarationPosition: number;
	scopeEnd: number;
	ns?: string;
	aliasOf?: string;
};

type ResolvedBinding = {
	declarationPosition: number;
	scopeEnd: number;
	ns?: string;
};

type BindingsByName = Record<string, ResolvedBinding[]>;

type ScopeRange = {
	start: number;
	end: number;
};

type LexicalInfo = {
	code: boolean[];
	scopes: ScopeRange[];
};

type Position = {
	line: number;
	character: number;
};

const identifierPattern = /[a-zA-Z_$][a-zA-Z0-9_$]*/y;

export function parse(sourceCode: string, _settings: PluginSettings) {
	try {
		const lexicalInfo = getLexicalInfo(sourceCode);
		const bindings = parseBindings(sourceCode, lexicalInfo);
		return parseFunctionCalls(sourceCode, lexicalInfo, bindings);
	} catch (error) {
		console.error("Parsing error:", error);
		return [];
	}
}

function parseBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): BindingsByName {
	const bindings: BindingsByName = {};
	const candidates = [
		...parseVariableBindings(sourceCode, lexicalInfo),
		...parseAssignmentBindings(sourceCode, lexicalInfo),
		...parseFunctionDeclarationBindings(sourceCode, lexicalInfo),
		...parseFunctionParameterBindings(sourceCode, lexicalInfo),
		...parseCatchParameterBindings(sourceCode, lexicalInfo),
		...parseForLoopBindings(sourceCode, lexicalInfo),
	].sort((a, b) => a.declarationPosition - b.declarationPosition);

	for (const candidate of candidates) {
		const namespace =
			candidate.ns ??
			(candidate.aliasOf
				? getVisibleBinding(
						candidate.aliasOf,
						candidate.declarationPosition,
						bindings
					)?.ns
				: undefined);

		if (!bindings[candidate.name]) {
			bindings[candidate.name] = [];
		}

		bindings[candidate.name]!.push({
			declarationPosition: candidate.declarationPosition,
			scopeEnd: candidate.scopeEnd,
			ns: namespace,
		});
	}

	return bindings;
}

function parseFunctionCalls(
	sourceCode: string,
	lexicalInfo: LexicalInfo,
	bindings: BindingsByName
) {
	const matches = [];
	const lineStarts = getLineStarts(sourceCode);

	for (let index = 0; index < sourceCode.length; index += 1) {
		if (
			!isIdentifierStart(sourceCode[index]) ||
			!isCodeAt(lexicalInfo, index)
		) {
			continue;
		}

		const nameStart = index;
		const functionName = readIdentifier(sourceCode, index);
		if (!functionName || /^(?:use|get)Translations$/.test(functionName)) {
			continue;
		}
		index = nameStart + functionName.length - 1;

		const openParen = skipWhitespaceOnly(
			sourceCode,
			nameStart + functionName.length
		);
		if (sourceCode[openParen] !== "(") continue;

		const firstArgStart = skipWhitespaceOnly(sourceCode, openParen + 1);
		const quote = sourceCode[firstArgStart];
		if (quote !== '"' && quote !== "'") continue;

		const firstArgEnd = findStringEnd(sourceCode, firstArgStart);
		if (firstArgEnd === undefined) continue;

		const messageId = sourceCode.slice(firstArgStart + 1, firstArgEnd);
		const binding = getVisibleBinding(functionName, nameStart, bindings);
		let finalMessageId: string | undefined;

		if (functionName === "t") {
			if (binding && !binding.ns) continue;
			finalMessageId = binding?.ns ? `${binding.ns}.${messageId}` : messageId;
		} else {
			if (!binding?.ns) continue;
			finalMessageId = `${binding.ns}.${messageId}`;
		}

		matches.push({
			messageId: finalMessageId,
			position: {
				start: getPosition(firstArgStart, lineStarts),
				end: getPosition(firstArgEnd + 1, lineStarts),
			},
		});
	}

	return matches;
}

function parseVariableBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): Binding[] {
	const bindings: Binding[] = [];
	const declarationPattern = /\b(?:const|let|var)\b/g;

	for (const match of sourceCode.matchAll(declarationPattern)) {
		const declarationPosition = match.index;
		if (!isCodeAt(lexicalInfo, declarationPosition)) continue;

		let cursor = skipWhitespace(
			sourceCode,
			declarationPosition + match[0].length,
			lexicalInfo
		);
		const lhsStart = cursor;
		let lhsEnd: number | undefined;

		if (sourceCode[cursor] === "{") {
			lhsEnd = findMatchingDelimiter(sourceCode, cursor, "{", "}", lexicalInfo);
			if (lhsEnd === undefined) continue;
			cursor = lhsEnd + 1;
		} else {
			const name = readIdentifier(sourceCode, cursor);
			if (!name) continue;
			lhsEnd = cursor + name.length;
			cursor = lhsEnd;
		}

		cursor = skipWhitespace(sourceCode, cursor, lexicalInfo);
		const lhs = sourceCode.slice(lhsStart, lhsEnd + 1);
		const bindingName = getBindingNameFromPattern(lhs);
		if (!bindingName) continue;

		const scopeEnd = getDeclarationScopeEnd(declarationPosition, lexicalInfo);

		if (sourceCode[cursor] !== "=") {
			if (sourceCode[cursor] === ";" || sourceCode[cursor] === "\n") {
				bindings.push({
					name: bindingName,
					declarationPosition,
					scopeEnd,
				});
			}
			continue;
		}

		const expressionStart = skipWhitespace(sourceCode, cursor + 1, lexicalInfo);
		const expressionEnd = findStatementEnd(
			sourceCode,
			expressionStart,
			lexicalInfo
		);
		const expression = sourceCode.slice(expressionStart, expressionEnd).trim();
		const namespace = getTranslationNamespace(expression);
		const aliasOf = getSimpleIdentifierExpression(expression);
		if (
			!namespace &&
			!aliasOf &&
			bindingName === "t" &&
			isRawTFactory(expression)
		) {
			continue;
		}

		bindings.push({
			name: bindingName,
			declarationPosition,
			scopeEnd,
			ns: namespace,
			aliasOf: namespace ? undefined : aliasOf,
		});
	}

	return bindings;
}

function parseAssignmentBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): Binding[] {
	const bindings: Binding[] = [];

	for (let index = 0; index < sourceCode.length; index += 1) {
		if (
			!isIdentifierStart(sourceCode[index]) ||
			!isCodeAt(lexicalInfo, index)
		) {
			continue;
		}

		const nameStart = index;
		const name = readIdentifier(sourceCode, index);
		if (!name) continue;
		index = nameStart + name.length - 1;

		if (isDeclarationIdentifier(sourceCode, nameStart, lexicalInfo)) continue;
		if (previousNonWhitespace(sourceCode, nameStart - 1) === ".") continue;

		const equalsIndex = skipWhitespace(
			sourceCode,
			nameStart + name.length,
			lexicalInfo
		);
		if (sourceCode[equalsIndex] !== "=") continue;
		if (
			sourceCode[equalsIndex + 1] === ">" ||
			sourceCode[equalsIndex + 1] === "="
		) {
			continue;
		}
		if (
			sourceCode[equalsIndex - 1] === "!" ||
			sourceCode[equalsIndex - 1] === "<" ||
			sourceCode[equalsIndex - 1] === ">"
		) {
			continue;
		}

		const expressionStart = skipWhitespace(
			sourceCode,
			equalsIndex + 1,
			lexicalInfo
		);
		const expressionEnd = findStatementEnd(
			sourceCode,
			expressionStart,
			lexicalInfo
		);
		const expression = sourceCode.slice(expressionStart, expressionEnd).trim();
		const namespace = getTranslationNamespace(expression);
		const aliasOf = getSimpleIdentifierExpression(expression);

		bindings.push({
			name,
			declarationPosition: nameStart,
			scopeEnd: getDeclarationScopeEnd(nameStart, lexicalInfo),
			ns: namespace,
			aliasOf: namespace ? undefined : aliasOf,
		});
	}

	return bindings;
}

function parseFunctionDeclarationBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): Binding[] {
	const bindings: Binding[] = [];
	const functionPattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;

	for (const match of sourceCode.matchAll(functionPattern)) {
		const declarationPosition = match.index;
		if (!isCodeAt(lexicalInfo, declarationPosition)) continue;
		const name = match[1];
		if (!name) continue;

		bindings.push({
			name,
			declarationPosition,
			scopeEnd: getDeclarationScopeEnd(declarationPosition, lexicalInfo),
		});
	}

	return bindings;
}

function parseFunctionParameterBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): Binding[] {
	const bindings: Binding[] = [];

	for (const match of sourceCode.matchAll(
		/\bfunction(?:\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*\(/g
	)) {
		const openParen = sourceCode.indexOf("(", match.index);
		if (!isCodeAt(lexicalInfo, match.index)) continue;
		const closeParen = findMatchingDelimiter(
			sourceCode,
			openParen,
			"(",
			")",
			lexicalInfo
		);
		if (closeParen === undefined) continue;
		const bodyStart = skipWhitespace(sourceCode, closeParen + 1, lexicalInfo);
		if (sourceCode[bodyStart] !== "{") continue;
		const bodyEnd = findMatchingDelimiter(
			sourceCode,
			bodyStart,
			"{",
			"}",
			lexicalInfo
		);
		if (bodyEnd === undefined) continue;

		for (const parameter of getParameterBindings(
			sourceCode,
			openParen + 1,
			closeParen
		)) {
			bindings.push({
				name: parameter.name,
				declarationPosition: parameter.position,
				scopeEnd: bodyEnd,
			});
		}
	}

	for (const match of sourceCode.matchAll(/\(([^()]*)\)\s*=>/g)) {
		const openParen = match.index;
		if (!isCodeAt(lexicalInfo, openParen)) continue;
		const closeParen = sourceCode.indexOf(")", openParen);
		const bodyStart = skipWhitespace(
			sourceCode,
			openParen + match[0].length,
			lexicalInfo
		);
		const bodyEnd = getArrowBodyEnd(sourceCode, bodyStart, lexicalInfo);

		for (const parameter of getParameterBindings(
			sourceCode,
			openParen + 1,
			closeParen
		)) {
			bindings.push({
				name: parameter.name,
				declarationPosition: parameter.position,
				scopeEnd: bodyEnd,
			});
		}
	}

	for (const match of sourceCode.matchAll(
		/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g
	)) {
		const name = match[1];
		const nameStart = match.index;
		if (!name || !isCodeAt(lexicalInfo, nameStart)) continue;
		if (previousNonWhitespace(sourceCode, nameStart - 1) === ")") continue;
		const bodyStart = skipWhitespace(
			sourceCode,
			nameStart + match[0].length,
			lexicalInfo
		);
		bindings.push({
			name,
			declarationPosition: nameStart,
			scopeEnd: getArrowBodyEnd(sourceCode, bodyStart, lexicalInfo),
		});
	}

	return bindings;
}

function parseCatchParameterBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): Binding[] {
	const bindings: Binding[] = [];
	const catchPattern = /\bcatch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)\s*\{/g;

	for (const match of sourceCode.matchAll(catchPattern)) {
		const declarationPosition = match.index;
		if (!isCodeAt(lexicalInfo, declarationPosition)) continue;
		const bodyStart = sourceCode.indexOf("{", declarationPosition);
		const bodyEnd = findMatchingDelimiter(
			sourceCode,
			bodyStart,
			"{",
			"}",
			lexicalInfo
		);
		if (bodyEnd === undefined || !match[1]) continue;

		bindings.push({
			name: match[1],
			declarationPosition,
			scopeEnd: bodyEnd,
		});
	}

	return bindings;
}

function parseForLoopBindings(
	sourceCode: string,
	lexicalInfo: LexicalInfo
): Binding[] {
	const bindings: Binding[] = [];
	const forPattern =
		/\bfor\s*\(\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b[^)]*\)\s*\{/g;

	for (const match of sourceCode.matchAll(forPattern)) {
		const declarationPosition = match.index;
		if (!isCodeAt(lexicalInfo, declarationPosition)) continue;
		const bodyStart = sourceCode.indexOf("{", declarationPosition);
		const bodyEnd = findMatchingDelimiter(
			sourceCode,
			bodyStart,
			"{",
			"}",
			lexicalInfo
		);
		if (bodyEnd === undefined || !match[1]) continue;

		bindings.push({
			name: match[1],
			declarationPosition,
			scopeEnd: bodyEnd,
		});
	}

	return bindings;
}

function getVisibleBinding(
	name: string,
	offset: number,
	bindings: BindingsByName
): ResolvedBinding | undefined {
	const nameBindings = bindings[name];
	if (!nameBindings) return undefined;

	let visibleBinding: ResolvedBinding | undefined;
	for (const binding of nameBindings) {
		if (binding.declarationPosition >= offset) continue;
		if (binding.scopeEnd < offset) continue;
		if (
			!visibleBinding ||
			binding.declarationPosition > visibleBinding.declarationPosition
		) {
			visibleBinding = binding;
		}
	}

	return visibleBinding;
}

function getBindingNameFromPattern(pattern: string): string | undefined {
	const trimmed = pattern.trim();
	if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
		return trimmed;
	}

	const destructured =
		/^\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*\}$/.exec(
			trimmed
		);
	return destructured?.[2] ?? destructured?.[1];
}

function getTranslationNamespace(expression: string): string | undefined {
	const call = /^(?:await\s+)?(?:use|get)Translations\s*\(([\s\S]*)\)\s*$/.exec(
		expression
	);
	if (!call) return undefined;

	const argument = call[1]?.trim() ?? "";
	const literalNamespace = /^["']([^"']*)["']/.exec(argument);
	if (literalNamespace) return literalNamespace[1];

	const objectNamespace = /\bnamespace\s*:\s*["']([^"']*)["']/.exec(argument);
	return objectNamespace?.[1];
}

function getSimpleIdentifierExpression(expression: string): string | undefined {
	const trimmed = expression.trim();
	return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed) ? trimmed : undefined;
}

function isRawTFactory(expression: string) {
	return /^useTranslation\s*\(/.test(expression.trim());
}

function getParameterBindings(
	sourceCode: string,
	start: number,
	end: number
): Array<{ name: string; position: number }> {
	const parameters = sourceCode.slice(start, end);
	const bindings = [];
	const parameterPattern = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;

	for (const match of parameters.matchAll(parameterPattern)) {
		if (!match[0]) continue;
		bindings.push({
			name: match[0],
			position: start + match.index,
		});
	}

	return bindings;
}

function getArrowBodyEnd(
	sourceCode: string,
	bodyStart: number,
	lexicalInfo: LexicalInfo
) {
	if (sourceCode[bodyStart] === "{") {
		return (
			findMatchingDelimiter(sourceCode, bodyStart, "{", "}", lexicalInfo) ??
			Number.POSITIVE_INFINITY
		);
	}

	return findStatementEnd(sourceCode, bodyStart, lexicalInfo);
}

function getDeclarationScopeEnd(
	declarationPosition: number,
	lexicalInfo: LexicalInfo
) {
	const containingScopes = lexicalInfo.scopes.filter(
		(scope) =>
			scope.start < declarationPosition && declarationPosition < scope.end
	);
	const innermostScope = containingScopes.sort((a, b) => b.start - a.start)[0];
	return innermostScope?.end ?? Number.POSITIVE_INFINITY;
}

function getLexicalInfo(sourceCode: string): LexicalInfo {
	const code = Array.from({ length: sourceCode.length }, () => true);
	const scopes: ScopeRange[] = [];
	const scopeStack: number[] = [];
	const templateStack: Array<{ expressionDepth: number }> = [];
	let state: "code" | "single" | "double" | "template" | "line" | "block" =
		"code";
	let escaped = false;

	for (let index = 0; index < sourceCode.length; index += 1) {
		const char = sourceCode[index];
		const nextChar = sourceCode[index + 1];

		if (state === "line") {
			code[index] = false;
			if (char === "\n") {
				code[index] = true;
				state = "code";
			}
			continue;
		}

		if (state === "block") {
			code[index] = false;
			if (char === "*" && nextChar === "/") {
				code[index + 1] = false;
				index += 1;
				state = "code";
			}
			continue;
		}

		if (state === "single" || state === "double") {
			code[index] = false;
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (
				(state === "single" && char === "'") ||
				(state === "double" && char === '"')
			) {
				state = "code";
			}
			continue;
		}

		if (state === "template") {
			code[index] = false;
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === "`") {
				state = "code";
				continue;
			}
			if (char === "$" && nextChar === "{") {
				code[index] = true;
				code[index + 1] = true;
				scopeStack.push(index + 1);
				templateStack.push({ expressionDepth: scopeStack.length });
				state = "code";
				index += 1;
			}
			continue;
		}

		if (char === "/" && nextChar === "/") {
			code[index] = false;
			code[index + 1] = false;
			index += 1;
			state = "line";
			continue;
		}
		if (char === "/" && nextChar === "*") {
			code[index] = false;
			code[index + 1] = false;
			index += 1;
			state = "block";
			continue;
		}
		if (char === "'") {
			code[index] = false;
			state = "single";
			escaped = false;
			continue;
		}
		if (char === '"') {
			code[index] = false;
			state = "double";
			escaped = false;
			continue;
		}
		if (char === "`") {
			code[index] = false;
			state = "template";
			escaped = false;
			continue;
		}
		if (char === "{") {
			scopeStack.push(index);
			continue;
		}
		if (char === "}") {
			const scopeStart = scopeStack.pop();
			if (scopeStart !== undefined) {
				scopes.push({ start: scopeStart, end: index });
			}
			const templateExpression = templateStack[templateStack.length - 1];
			if (
				templateExpression &&
				scopeStack.length < templateExpression.expressionDepth
			) {
				templateStack.pop();
				state = "template";
			}
		}
	}

	return { code, scopes };
}

function findStatementEnd(
	sourceCode: string,
	start: number,
	lexicalInfo: LexicalInfo
) {
	let depth = 0;

	for (let index = start; index < sourceCode.length; index += 1) {
		if (!isCodeAt(lexicalInfo, index)) continue;
		const char = sourceCode[index];

		if (char === "(" || char === "{" || char === "[") depth += 1;
		if (char === ")" || char === "}" || char === "]") {
			if (depth === 0) return index;
			depth -= 1;
		}
		if (depth === 0 && (char === ";" || char === "\n")) return index;
	}

	return sourceCode.length;
}

function findMatchingDelimiter(
	sourceCode: string,
	start: number,
	open: string,
	close: string,
	lexicalInfo: LexicalInfo
): number | undefined {
	let depth = 0;

	for (let index = start; index < sourceCode.length; index += 1) {
		if (!isCodeAt(lexicalInfo, index)) continue;
		if (sourceCode[index] === open) depth += 1;
		if (sourceCode[index] === close) {
			depth -= 1;
			if (depth === 0) return index;
		}
	}

	return undefined;
}

function skipWhitespace(
	sourceCode: string,
	start: number,
	lexicalInfo: LexicalInfo
) {
	let index = start;
	while (
		index < sourceCode.length &&
		(!isCodeAt(lexicalInfo, index) || /\s/.test(sourceCode[index] ?? ""))
	) {
		index += 1;
	}
	return index;
}

function skipWhitespaceOnly(sourceCode: string, start: number) {
	let index = start;
	while (index < sourceCode.length && /\s/.test(sourceCode[index] ?? "")) {
		index += 1;
	}
	return index;
}

function isDeclarationIdentifier(
	sourceCode: string,
	nameStart: number,
	lexicalInfo: LexicalInfo
) {
	const previousWord = getPreviousWord(sourceCode, nameStart);
	if (
		previousWord === "const" ||
		previousWord === "let" ||
		previousWord === "var"
	) {
		return true;
	}
	if (previousWord === "function") return true;

	const nextIndex = skipWhitespace(
		sourceCode,
		nameStart + (readIdentifier(sourceCode, nameStart)?.length ?? 0),
		lexicalInfo
	);
	return (
		sourceCode[nextIndex] === ")" &&
		sourceCode.slice(nextIndex).startsWith(") =>")
	);
}

function getPreviousWord(sourceCode: string, end: number) {
	let cursor = end - 1;
	while (cursor >= 0 && /\s/.test(sourceCode[cursor] ?? "")) cursor -= 1;
	let wordEnd = cursor + 1;
	while (cursor >= 0 && /[a-zA-Z_$]/.test(sourceCode[cursor] ?? ""))
		cursor -= 1;
	return sourceCode.slice(cursor + 1, wordEnd);
}

function previousNonWhitespace(sourceCode: string, start: number) {
	let index = start;
	while (index >= 0 && /\s/.test(sourceCode[index] ?? "")) index -= 1;
	return sourceCode[index];
}

function readIdentifier(sourceCode: string, start: number) {
	identifierPattern.lastIndex = start;
	return identifierPattern.exec(sourceCode)?.[0];
}

function isIdentifierStart(char: string | undefined) {
	return Boolean(char && /[a-zA-Z_$]/.test(char));
}

function isCodeAt(lexicalInfo: LexicalInfo, index: number) {
	return lexicalInfo.code[index] === true;
}

function findStringEnd(sourceCode: string, start: number) {
	const quote = sourceCode[start];
	let escaped = false;

	for (let index = start + 1; index < sourceCode.length; index += 1) {
		const char = sourceCode[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (char === "\\") {
			escaped = true;
			continue;
		}
		if (char === quote) return index;
	}

	return undefined;
}

function getLineStarts(sourceCode: string) {
	const lineStarts = [0];
	for (let index = 0; index < sourceCode.length; index += 1) {
		if (sourceCode[index] === "\n") lineStarts.push(index + 1);
	}
	return lineStarts;
}

function getPosition(offset: number, lineStarts: number[]): Position {
	let line = 0;
	for (let index = 0; index < lineStarts.length; index += 1) {
		if (lineStarts[index]! > offset) break;
		line = index;
	}

	return {
		line: line + 1,
		character: offset - lineStarts[line]! + 1,
	};
}
