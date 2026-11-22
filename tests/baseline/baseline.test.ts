import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decode, difference, observers } from './format.ts';
import { useBaselineTimeZone } from './observe.ts';
import { cores, oldCore, type Core } from './cores.ts';

// The baseline records what the planner showed before the rebuild. Each section is one test per core: the old core in
// src/lib, which the app still uses, and the new one in src/domain, which must show the same. Saved data is loaded
// only by the old core until step 3 of the rebuild. A failure names every case that changed and its first difference.
// If a change is deliberate, rewrite the record with `npm run baseline:update` and review its diff.
useBaselineTimeZone();
const baseline = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));

for (const section of ['plans', 'formulas', 'restores', 'helpers'] as const)
  for (const core of section === 'restores' ? [oldCore] : cores) {
    const rows = baseline[section] as { name: string; input: unknown; output: unknown }[],
      observe = observers[section] as (input: never, core: Core) => unknown;
    test(`baseline: ${section} match the recorded behaviour, ${core.name} core (${rows.length} cases)`, () => {
      assert.ok(rows.length > 0, `no ${section} recorded`);
      // A fresh observation goes through JSON as the recorded one did, so an infinite batch count compares as the null the file holds.
      const changed = rows.flatMap(({ name, input, output }) => {
        const d = difference(output, JSON.parse(JSON.stringify(observe(input as never, core) ?? null)));
        return d ? [`${name}: ${d}`] : [];
      });
      assert.equal(
        changed.length,
        0,
        `${changed.length} of ${rows.length} ${section} changed:\n${changed.slice(0, 10).join('\n')}${changed.length > 10 ? `\n…and ${changed.length - 10} more` : ''}`,
      );
    });
  }
