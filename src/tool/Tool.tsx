import { useState } from 'react';
import { SegmentedControl } from '@mmoall/tool-kit';
import { CsvToJsonTab } from './CsvToJsonTab';
import { JsonToCsvTab } from './JsonToCsvTab';

type Tab = 'json-to-csv' | 'csv-to-json';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'json-to-csv', label: 'JSON → CSV' },
  { value: 'csv-to-json', label: 'CSV → JSON' },
];

export function Tool() {
  const [tab, setTab] = useState<Tab>('json-to-csv');

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SegmentedControl aria-label="Direction" value={tab} onChange={setTab} options={TAB_OPTIONS} />
      </div>
      <div hidden={tab !== 'json-to-csv'}>
        <JsonToCsvTab />
      </div>
      <div hidden={tab !== 'csv-to-json'}>
        <CsvToJsonTab />
      </div>
    </div>
  );
}
