// Pure, framework-free CSV parsing/serialization and JSON ⇄ CSV conversion.

export type Delimiter = ',' | ';' | '\t' | '|';

export class CsvParseError extends Error {
  line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'CsvParseError';
    this.line = line;
  }
}

// ---------------------------------------------------------------------------
// CSV primitives
// ---------------------------------------------------------------------------

/** RFC 4180 parser: quoted fields, escaped quotes (""), embedded newlines, CRLF/LF. */
export function parseCsv(input: string, delimiter: Delimiter): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let quoteStartLine = 1;
  let line = 1;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      if (ch === '\n') line++;
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === '') {
      inQuotes = true;
      quoteStartLine = line;
      i++;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\r' || ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
      line++;
    } else {
      field += ch;
      i++;
    }
  }

  if (inQuotes) {
    throw new CsvParseError('Unterminated quoted field', quoteStartLine);
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Ignore blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Picks the delimiter that splits the first lines most consistently. */
export function detectDelimiter(input: string): Delimiter {
  const sample = input.split(/\r?\n/).filter((l) => l.trim() !== '').slice(0, 10);
  const candidates: Delimiter[] = [',', ';', '\t', '|'];
  let best: Delimiter = ',';
  let bestScore = 0;
  for (const candidate of candidates) {
    const counts = sample.map((l) => l.split(candidate).length - 1);
    if (counts.length === 0 || counts[0] === 0) continue;
    const consistent = counts.filter((c) => c === counts[0]).length;
    const score = consistent * 1000 + counts[0];
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

export function escapeCsvField(value: string, delimiter: Delimiter, quoteAll: boolean): string {
  const needsQuotes =
    quoteAll ||
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    /^\s|\s$/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

// ---------------------------------------------------------------------------
// JSON → CSV
// ---------------------------------------------------------------------------

export type ArrayMode = 'json' | 'index' | 'join';

export interface JsonToCsvOptions {
  delimiter: Delimiter;
  quoteAll: boolean;
  header: boolean;
  flatten: boolean;
  arrays: ArrayMode;
  crlf: boolean;
}

export interface Table {
  headers: string[];
  rows: string[][];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Flattens nested objects into dot-separated keys. */
export function flattenRecord(
  value: Record<string, unknown>,
  arrays: ArrayMode,
  prefix = '',
  out: Record<string, unknown> = {},
): Record<string, unknown> {
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(entry) && Object.keys(entry).length > 0) {
      flattenRecord(entry, arrays, path, out);
    } else if (Array.isArray(entry) && arrays === 'index' && entry.length > 0) {
      const asObject: Record<string, unknown> = {};
      entry.forEach((item, index) => {
        asObject[String(index)] = item;
      });
      flattenRecord(asObject, arrays, path, out);
    } else if (Array.isArray(entry) && arrays === 'join' && entry.every((item) => !isPlainObject(item) && !Array.isArray(item))) {
      out[path] = entry.map(cellText).join('; ');
    } else {
      out[path] = entry;
    }
  }
  return out;
}

/** Turns parsed JSON into a table of string cells. */
export function jsonToTable(data: unknown, options: Pick<JsonToCsvOptions, 'flatten' | 'arrays'>): Table {
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return { headers: [], rows: [] };

  if (items.every((item) => Array.isArray(item))) {
    const width = Math.max(...items.map((item) => (item as unknown[]).length));
    const headers = Array.from({ length: width }, (_, i) => `column${i + 1}`);
    return { headers, rows: (items as unknown[][]).map((item) => headers.map((_, i) => cellText(item[i]))) };
  }

  const records: Record<string, unknown>[] = items.map((item) => {
    if (!isPlainObject(item)) return { value: item };
    return options.flatten ? flattenRecord(item, options.arrays) : item;
  });
  const headerSet = new Set<string>();
  for (const record of records) for (const key of Object.keys(record)) headerSet.add(key);
  const headers = [...headerSet];
  const rows = records.map((record) => headers.map((header) => cellText(record[header])));
  return { headers, rows };
}

export function tableToCsv(table: Table, options: JsonToCsvOptions): string {
  const eol = options.crlf ? '\r\n' : '\n';
  const lines: string[] = [];
  const encode = (cells: string[]) =>
    cells.map((cell) => escapeCsvField(cell, options.delimiter, options.quoteAll)).join(options.delimiter);
  if (options.header) lines.push(encode(table.headers));
  for (const row of table.rows) lines.push(encode(row));
  return lines.join(eol);
}

export function describeJsonShapeError(data: unknown): string | null {
  if (data === null || typeof data !== 'object') {
    return 'Expected a JSON array of objects (or a single object) — got a primitive value.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSV → JSON
// ---------------------------------------------------------------------------

export interface CsvToJsonOptions {
  delimiter: Delimiter | 'auto';
  header: boolean;
  inferTypes: boolean;
  /** Turn "a.b" headers back into nested objects. */
  unflatten: boolean;
}

export interface CsvToJsonResult {
  data: unknown[];
  table: Table;
  delimiter: Delimiter;
  raggedRows: number;
}

const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** Infers numbers, booleans, and null from a CSV cell. Empty cells become null. */
export function inferValue(cell: string): unknown {
  const trimmed = cell.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') return null;
  if (trimmed === 'true' || trimmed === 'TRUE') return true;
  if (trimmed === 'false' || trimmed === 'FALSE') return false;
  if (NUMBER_PATTERN.test(trimmed)) {
    const number = Number(trimmed);
    // Keep values that would lose precision (e.g. long IDs) as strings.
    if (Number.isFinite(number) && (!/^-?\d+$/.test(trimmed) || Number.isSafeInteger(number))) {
      return number;
    }
  }
  return cell;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let node: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node[parts[i]];
    if (!isPlainObject(next)) {
      if (next !== undefined) {
        // Conflict such as "a" and "a.b" — keep the flat key.
        target[path] = value;
        return;
      }
      node[parts[i]] = {};
    }
    node = node[parts[i]] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.trim() === '' ? `column${index + 1}` : header;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

export function csvToJson(input: string, options: CsvToJsonOptions): CsvToJsonResult {
  const delimiter = options.delimiter === 'auto' ? detectDelimiter(input) : options.delimiter;
  const rows = parseCsv(input, delimiter);
  const width = Math.max(0, ...rows.map((row) => row.length));

  let headers: string[];
  let body: string[][];
  if (options.header && rows.length > 0) {
    headers = uniqueHeaders([...rows[0], ...Array<string>(Math.max(0, width - rows[0].length)).fill('')]);
    body = rows.slice(1);
  } else {
    headers = Array.from({ length: width }, (_, i) => `column${i + 1}`);
    body = rows;
  }

  const expected = rows[0]?.length ?? 0;
  let raggedRows = 0;
  const data = body.map((row) => {
    if (row.length !== expected) raggedRows++;
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const cell = row[index] ?? '';
      const value = options.inferTypes ? inferValue(cell) : cell;
      if (options.unflatten && header.includes('.')) setPath(record, header, value);
      else record[header] = value;
    });
    return record;
  });

  const table: Table = {
    headers,
    rows: body.map((row) => headers.map((_, index) => row[index] ?? '')),
  };
  return { data, table, delimiter, raggedRows };
}
