/**
 * The layout of baseline.json. Step titles, notes and readiness cues repeat across hundreds of plans, so each distinct
 * one is stored once in `texts` and steps refer to it by number. A step leaves out the room-temperature phase and a
 * zero gap, which most steps have. Steps are written one per line so a change reads as a diff.
 */
import {
  observePlan,
  observeFormula,
  observeRestore,
  observeHelper,
  TIME_ZONE,
  type PlanInput,
  type FormulaInput,
  type HelperCall,
} from './observe.ts';

export type Section<I, O> = { name: string; input: I; output: O }[];
export type Baseline = {
  about: string;
  recordedFrom: string;
  timeZone: string;
  texts: string[];
  plans: Section<PlanInput, ReturnType<typeof observePlan>>;
  formulas: Section<FormulaInput, ReturnType<typeof observeFormula>>;
  restores: Section<unknown, ReturnType<typeof observeRestore>>;
  helpers: Section<HelperCall, unknown>;
};
export const observers = {
  plans: observePlan,
  formulas: observeFormula,
  restores: observeRestore,
  helpers: observeHelper,
} as const;
type StepOut = ReturnType<typeof observePlan>['steps'][number];
type Stored = Omit<StepOut, 'title' | 'note' | 'ready' | 'phase' | 'gap'> & {
  title: number;
  note?: number;
  ready?: number;
  phase?: string;
  gap?: number;
};

export function encode(b: Omit<Baseline, 'texts' | 'timeZone'>) {
  const texts: string[] = [],
    index = new Map<string, number>();
  const ref = (t: string) => {
    let i = index.get(t);
    if (i === undefined) {
      i = texts.length;
      texts.push(t);
      index.set(t, i);
    }
    return i;
  };
  const store = (s: StepOut): Stored => {
    const { id, title, at, phase, gap, note, ready, ...rest } = s;
    return {
      id,
      title: ref(title),
      at,
      ...(phase !== 'room' ? { phase } : {}),
      ...(gap !== 0 ? { gap } : {}),
      ...(note !== undefined ? { note: ref(note) } : {}),
      ...(ready !== undefined ? { ready: ref(ready) } : {}),
      ...rest,
    };
  };
  const block = (rows: { name: string; input: unknown; output: unknown }[], steps = false) =>
    rows
      .map((row) => {
        if (!steps || row.output === null) return `  ${JSON.stringify(row)}`;
        const { steps: list, ...rest } = row.output as { steps: StepOut[] };
        const head = JSON.stringify({ name: row.name, input: row.input, output: { ...rest, steps: '<steps>' } });
        // A function, so `$&` or `$'` in a step is written as it is rather than read as a replacement pattern.
        return `  ${head.replace('"<steps>"', () => (list.length ? `[\n${list.map((s) => `    ${JSON.stringify(store(s))}`).join(',\n')}\n  ]` : '[]'))}`;
      })
      .join(',\n');
  const plans = block(b.plans, true);
  return (
    `{\n"about": ${JSON.stringify(b.about)},\n"recordedFrom": ${JSON.stringify(b.recordedFrom)},\n"timeZone": ${JSON.stringify(TIME_ZONE)},\n` +
    `"texts": [\n${texts.map((t) => `  ${JSON.stringify(t)}`).join(',\n')}\n],\n` +
    `"plans": [\n${plans}\n],\n"formulas": [\n${block(b.formulas)}\n],\n"restores": [\n${block(b.restores)}\n],\n"helpers": [\n${block(b.helpers)}\n]\n}\n`
  );
}

/** Reads baseline.json back, with the step notes and cues written out again. */
export function decode(json: string): Baseline {
  const raw = JSON.parse(json) as Omit<Baseline, 'plans'> & { plans: Section<PlanInput, { steps: Stored[] }> };
  const text = (i: number) => raw.texts[i];
  const step = ({ title, note, ready, phase, gap, ...rest }: Stored) => ({
    ...rest,
    title: text(title),
    phase: phase ?? 'room',
    gap: gap ?? 0,
    ...(note !== undefined ? { note: text(note) } : {}),
    ...(ready !== undefined ? { ready: text(ready) } : {}),
  });
  const plans = raw.plans.map((row) => ({ ...row, output: { ...row.output, steps: row.output.steps.map(step) } }));
  return { ...raw, plans } as unknown as Baseline;
}

/**
 * The first difference between a recorded and a fresh observation, or null. Numbers may differ by floating-point
 * noise (one part in a billion); text, times and structure must match exactly.
 */
export function difference(expected: unknown, actual: unknown, path = 'output'): string | null {
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (expected === actual || Math.abs(expected - actual) <= 1e-9 * Math.max(1, Math.abs(expected))) return null;
    return `${path}: expected ${expected}, got ${actual}`;
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual))
      return `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
      if (i >= expected.length) return `${path}[${i}]: unexpected ${JSON.stringify(actual[i])}`;
      if (i >= actual.length) return `${path}[${i}]: missing ${JSON.stringify(expected[i])}`;
      const d = difference(expected[i], actual[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const e = expected as Record<string, unknown>,
      a = actual as Record<string, unknown>;
    for (const key of new Set([...Object.keys(e), ...Object.keys(a)])) {
      if (!(key in a)) return `${path}.${key}: missing ${JSON.stringify(e[key])}`;
      if (!(key in e)) return `${path}.${key}: unexpected ${JSON.stringify(a[key])}`;
      const d = difference(e[key], a[key], `${path}.${key}`);
      if (d) return d;
    }
    return null;
  }
  return Object.is(expected, actual)
    ? null
    : `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}
