import { useDeferredValue, useMemo, useState } from 'react';
import { SegmentedControl, Switch, ToolbarDivider, type StatusTone } from '@mmoall/tool-kit';
import { CsvParseError, csvToJson, type Delimiter } from './csv';
import { SAMPLE_CSV } from './samples';
import { ConverterLayout, useStickyOutput, type Outcome } from './ui-parts';

type DelimiterChoice = Delimiter | 'auto';
type IndentOption = '2' | '4' | 'min';

const DELIMITER_OPTIONS: { value: DelimiterChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: ',', label: ',' },
  { value: ';', label: ';' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: '|' },
];

const INDENT_OPTIONS: { value: IndentOption; label: string }[] = [
  { value: '2', label: '2 sp' },
  { value: '4', label: '4 sp' },
  { value: 'min', label: 'Min' },
];

const DELIMITER_NAMES: Record<Delimiter, string> = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' };

export function CsvToJsonTab() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState<DelimiterChoice>('auto');
  const [header, setHeader] = useState(true);
  const [inferTypes, setInferTypes] = useState(true);
  const [unflatten, setUnflatten] = useState(false);
  const [indent, setIndent] = useState<IndentOption>('2');
  const deferredInput = useDeferredValue(input);

  const outcome = useMemo<Outcome<{ delimiter: Delimiter; raggedRows: number }>>(() => {
    if (deferredInput.trim() === '') return { kind: 'empty' };
    try {
      const result = csvToJson(deferredInput, { delimiter, header, inferTypes, unflatten });
      const output =
        indent === 'min' ? JSON.stringify(result.data) : JSON.stringify(result.data, null, Number(indent));
      return {
        kind: 'ok',
        output,
        table: result.table,
        extra: { delimiter: result.delimiter, raggedRows: result.raggedRows },
      };
    } catch (err) {
      const message =
        err instanceof CsvParseError
          ? `Invalid CSV: ${err.message} (starting on line ${err.line})`
          : err instanceof Error
            ? err.message
            : String(err);
      return { kind: 'error', message };
    }
  }, [deferredInput, delimiter, header, inferTypes, unflatten, indent]);

  const { output, table, stale } = useStickyOutput(outcome);

  const status: { tone: StatusTone; label: string } =
    outcome.kind === 'error'
      ? { tone: 'danger', label: 'Invalid CSV' }
      : outcome.kind === 'ok'
        ? { tone: 'success', label: 'Parsed' }
        : { tone: 'neutral', label: 'Waiting for input' };

  let notice: string | null = null;
  if (outcome.kind === 'ok') {
    const notes: string[] = [];
    if (delimiter === 'auto') notes.push(`Detected delimiter: ${DELIMITER_NAMES[outcome.extra.delimiter]}.`);
    if (outcome.extra.raggedRows > 0) {
      notes.push(
        `${outcome.extra.raggedRows} ${outcome.extra.raggedRows === 1 ? 'row has' : 'rows have'} a different number of fields than the first row.`,
      );
    }
    notice = notes.join(' ') || null;
  }

  return (
    <ConverterLayout
      controls={
        <>
          <SegmentedControl aria-label="Delimiter" value={delimiter} onChange={setDelimiter} options={DELIMITER_OPTIONS} />
          <SegmentedControl aria-label="JSON indentation" value={indent} onChange={setIndent} options={INDENT_OPTIONS} />
          <ToolbarDivider />
          <Switch checked={header} onChange={setHeader} label="Header row" className="px-1" />
          <Switch checked={inferTypes} onChange={setInferTypes} label="Infer types" className="px-1" />
          <Switch checked={unflatten} onChange={setUnflatten} label="Nest dot keys" className="px-1" />
        </>
      }
      input={input}
      onInputChange={setInput}
      onSample={() => setInput(SAMPLE_CSV)}
      inputLabel="CSV"
      outputLabel="JSON"
      output={output}
      table={table}
      stale={stale}
      status={status}
      error={outcome.kind === 'error' ? outcome.message : null}
      notice={notice}
      accept=".csv,.tsv,text/csv,text/plain"
      download={{ filename: 'converted.json', mime: 'application/json' }}
    />
  );
}
