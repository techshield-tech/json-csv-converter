import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Button,
  CodeArea,
  CopyButton,
  ErrorBox,
  Panel,
  StatusPill,
  Toolbar,
  type StatusTone,
} from '@mmoall/tool-kit';
import type { Table } from './csv';

export function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type Outcome<T> =
  | { kind: 'empty' }
  | { kind: 'ok'; output: string; table: Table; extra: T }
  | { kind: 'error'; message: string };

/** Keeps the last successful output visible (dimmed) while the input is invalid. */
export function useStickyOutput<T>(outcome: Outcome<T>): { output: string; table: Table | null; stale: boolean } {
  const [last, setLast] = useState<{ output: string; table: Table | null }>({ output: '', table: null });
  if (outcome.kind === 'ok' && (outcome.output !== last.output || outcome.table !== last.table)) {
    setLast({ output: outcome.output, table: outcome.table });
  }
  if (outcome.kind === 'empty') return { output: '', table: null, stale: false };
  if (outcome.kind === 'ok') return { output: outcome.output, table: outcome.table, stale: false };
  return { ...last, stale: true };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Stats({ text }: { text: string }) {
  if (!text) return null;
  const bytes = new TextEncoder().encode(text).length;
  const lines = text.split('\n').length;
  return (
    <span className="hidden text-xs tabular-nums text-[var(--color-muted)] sm:inline" title={`${bytes} bytes`}>
      {lines.toLocaleString()} {lines === 1 ? 'line' : 'lines'} · {formatBytes(bytes)}
    </span>
  );
}

const PREVIEW_ROWS = 200;

export function TablePreview({ table, stale }: { table: Table | null; stale: boolean }) {
  if (!table || table.headers.length === 0) return null;
  const shown = table.rows.slice(0, PREVIEW_ROWS);
  return (
    <Panel
      flush
      title="Table preview"
      actions={
        <span className="text-xs tabular-nums text-[var(--color-muted)]">
          {table.rows.length.toLocaleString()} {table.rows.length === 1 ? 'row' : 'rows'} ·{' '}
          {table.headers.length} {table.headers.length === 1 ? 'column' : 'columns'}
          {table.rows.length > PREVIEW_ROWS && ` · first ${PREVIEW_ROWS} shown`}
        </span>
      }
      className={stale ? 'opacity-50' : ''}
    >
      <div className="scroll-thin max-h-[420px] overflow-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="sticky top-0 bg-[var(--color-panel)]">
            <tr>
              <th className="w-10 border-b border-[var(--color-border)] px-3 py-2 text-right font-medium text-[var(--color-subtle)]">
                #
              </th>
              {table.headers.map((header, index) => (
                <th
                  key={index}
                  className="font-code border-b border-[var(--color-border)] px-3 py-2 font-semibold whitespace-nowrap text-[var(--color-fg)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-[var(--color-surface)] even:bg-[var(--color-panel)]">
                <td className="border-b border-[var(--color-border)] px-3 py-1.5 text-right tabular-nums text-[var(--color-subtle)]">
                  {rowIndex + 1}
                </td>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    title={cell.length > 80 ? cell : undefined}
                    className="font-code max-w-[320px] truncate border-b border-[var(--color-border)] px-3 py-1.5 whitespace-nowrap text-[var(--color-fg)]"
                  >
                    {cell === '' ? <span className="text-[var(--color-subtle)]">—</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export interface ConverterLayoutProps {
  controls: ReactNode;
  input: string;
  onInputChange: (value: string) => void;
  onSample: () => void;
  inputLabel: string;
  outputLabel: string;
  output: string;
  table: Table | null;
  stale: boolean;
  status: { tone: StatusTone; label: string };
  error: string | null;
  notice?: ReactNode;
  accept: string;
  download: { filename: string; mime: string };
  autoFocus?: boolean;
}

export function ConverterLayout({
  controls,
  input,
  onInputChange,
  onSample,
  inputLabel,
  outputLabel,
  output,
  table,
  stale,
  status,
  error,
  notice,
  accept,
  download,
  autoFocus = false,
}: ConverterLayoutProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canUseOutput = Boolean(output) && !stale;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onInputChange(await file.text());
  };

  return (
    <div className="flex flex-col gap-3">
      <Toolbar>
        {controls}
        <div className="ml-auto flex items-center gap-1">
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Open file
          </Button>
          <Button variant="ghost" onClick={onSample}>
            Sample
          </Button>
          <Button variant="ghost" onClick={() => onInputChange('')} disabled={!input}>
            Clear
          </Button>
        </div>
      </Toolbar>

      {error && <ErrorBox>{error}</ErrorBox>}
      {!error && notice && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5 text-sm text-[var(--color-muted)]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel
          flush
          className="h-[320px] lg:h-[480px]"
          title={
            <>
              {inputLabel}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </>
          }
          actions={<Stats text={input} />}
        >
          <CodeArea
            aria-label={`${inputLabel} input`}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={`Paste or type ${inputLabel} here…`}
            autoFocus={autoFocus}
          />
        </Panel>

        <Panel
          flush
          className="h-[320px] lg:h-[480px]"
          title={outputLabel}
          actions={
            <>
              <Stats text={output} />
              <Button
                variant="secondary"
                size="sm"
                disabled={!canUseOutput}
                onClick={() => downloadText(output, download.filename, download.mime)}
              >
                Download
              </Button>
              <CopyButton getText={() => output} disabled={!canUseOutput} />
            </>
          }
        >
          <CodeArea
            aria-label={outputLabel}
            value={output}
            readOnly
            placeholder="Output will appear here…"
            className={stale ? 'opacity-50' : ''}
          />
        </Panel>
      </div>

      <TablePreview table={table} stale={stale} />
    </div>
  );
}
