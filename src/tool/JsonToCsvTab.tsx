import { useDeferredValue, useMemo, useState } from 'react';
import { SegmentedControl, Select, Switch, ToolbarDivider, type StatusTone } from '@mmoall/tool-kit';
import {
  describeJsonShapeError,
  jsonToTable,
  tableToCsv,
  type ArrayMode,
  type Delimiter,
} from './csv';
import { describeJsonError, formatJsonErrorInfo } from './json-error';
import { SAMPLE_JSON } from './samples';
import { ConverterLayout, useStickyOutput, type Outcome } from './ui-parts';

const DELIMITER_OPTIONS: { value: Delimiter; label: string }[] = [
  { value: ',', label: 'Comma' },
  { value: ';', label: 'Semicolon' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe' },
];

const ARRAY_OPTIONS = [
  { value: 'json', label: 'Arrays as JSON' },
  { value: 'join', label: 'Arrays joined with ;' },
  { value: 'index', label: 'Arrays by index (a.0)' },
];

export function JsonToCsvTab() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [header, setHeader] = useState(true);
  const [quoteAll, setQuoteAll] = useState(false);
  const [flatten, setFlatten] = useState(true);
  const [arrays, setArrays] = useState<ArrayMode>('json');
  const [crlf, setCrlf] = useState(false);
  const deferredInput = useDeferredValue(input);

  const outcome = useMemo<Outcome<null>>(() => {
    if (deferredInput.trim() === '') return { kind: 'empty' };
    let data: unknown;
    try {
      data = JSON.parse(deferredInput);
    } catch (err) {
      return { kind: 'error', message: `Invalid JSON: ${formatJsonErrorInfo(describeJsonError(err, deferredInput))}` };
    }
    const shapeError = describeJsonShapeError(data);
    if (shapeError) return { kind: 'error', message: shapeError };
    const table = jsonToTable(data, { flatten, arrays });
    const output = tableToCsv(table, { delimiter, quoteAll, header, flatten, arrays, crlf });
    return { kind: 'ok', output, table, extra: null };
  }, [deferredInput, delimiter, header, quoteAll, flatten, arrays, crlf]);

  const { output, table, stale } = useStickyOutput(outcome);

  const status: { tone: StatusTone; label: string } =
    outcome.kind === 'error'
      ? { tone: 'danger', label: 'Invalid' }
      : outcome.kind === 'ok'
        ? { tone: 'success', label: 'Valid JSON' }
        : { tone: 'neutral', label: 'Waiting for input' };

  return (
    <ConverterLayout
      controls={
        <>
          <SegmentedControl aria-label="Delimiter" value={delimiter} onChange={setDelimiter} options={DELIMITER_OPTIONS} />
          <ToolbarDivider />
          <Switch checked={header} onChange={setHeader} label="Header row" className="px-1" />
          <Switch checked={quoteAll} onChange={setQuoteAll} label="Quote all" className="px-1" />
          <Switch checked={flatten} onChange={setFlatten} label="Flatten objects" className="px-1" />
          {flatten && (
            <Select
              aria-label="Array handling"
              value={arrays}
              onChange={(event) => setArrays(event.target.value as ArrayMode)}
              options={ARRAY_OPTIONS}
            />
          )}
          <Switch checked={crlf} onChange={setCrlf} label="CRLF" className="px-1" />
        </>
      }
      input={input}
      onInputChange={setInput}
      onSample={() => setInput(SAMPLE_JSON)}
      inputLabel="JSON"
      outputLabel="CSV"
      output={output}
      table={table}
      stale={stale}
      status={status}
      error={outcome.kind === 'error' ? outcome.message : null}
      accept=".json,application/json,text/plain"
      download={{ filename: 'converted.csv', mime: 'text/csv' }}
      autoFocus
    />
  );
}
