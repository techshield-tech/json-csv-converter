// Pure, framework-free helper that turns a JSON.parse SyntaxError into a
// human-friendly message with a 1-based line/column when it can be
// determined. Tool-specific.

export interface JsonErrorInfo {
  /** The raw error message. */
  message: string;
  /** 1-based line number, or null if it could not be determined. */
  line: number | null;
  /** 1-based column number, or null if it could not be determined. */
  column: number | null;
}

function lineColumnAtOffset(input: string, offset: number): { line: number; column: number } {
  const end = Math.max(0, Math.min(offset, input.length));
  let line = 1;
  let column = 1;
  for (let i = 0; i < end; i++) {
    if (input[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

/**
 * Extracts line/column info from a JSON.parse error.
 *
 * V8-based engines throw messages like:
 *   "Unexpected token o in JSON at position 4"
 *   "Unexpected non-whitespace character after JSON at position 10 (line 2 column 1)"
 * Newer V8 versions already include "(line X column Y)"; we use that
 * directly when present, and otherwise convert the character `position`
 * offset into a 1-based line/column by scanning `input`. Engines whose
 * message contains neither are handled gracefully by returning null
 * line/column alongside the raw message.
 */
export function describeJsonError(error: unknown, input: string): JsonErrorInfo {
  const message = error instanceof Error ? error.message : String(error);

  const lineColumnMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColumnMatch) {
    return {
      message,
      line: Number(lineColumnMatch[1]),
      column: Number(lineColumnMatch[2]),
    };
  }

  const positionMatch = message.match(/position (\d+)/i);
  if (positionMatch) {
    const { line, column } = lineColumnAtOffset(input, Number(positionMatch[1]));
    return { message, line, column };
  }

  return { message, line: null, column: null };
}

/** Formats a JsonErrorInfo into a single display string. */
export function formatJsonErrorInfo(info: JsonErrorInfo): string {
  if (info.line !== null && info.column !== null) {
    return `${info.message} (line ${info.line}, column ${info.column})`;
  }
  return info.message;
}
