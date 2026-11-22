import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { decode, difference } from './format.ts';
import { plannerState, local, atMoment, useBaselineTimeZone, type PlanInput } from './observe.ts';
import { dateString, durationText } from '../../src/domain/text.ts';
import { fromV6, serialize, STORAGE_V6 } from '../../src/state/load.ts';

/**
 * App.tsx itself against the record. `observePlan` reads the same view module the Schedule tab shows, so the baseline
 * test alone would pass even if a component showed it wrongly. This renders the real App.tsx on the server for every
 * recorded plan, saved in browser storage as the app saves it (version 6) and with the clock at the plan's moment, and
 * checks the Schedule tab
 * shows what the record says: each step's time, title, note, cue, gap, state and colour, the Up next card, the notices
 * and the bake summary. Times render as `HH:MM` and `YYYY-MM-DD` (see `atMoment`), so the check is the same on any machine.
 */
useBaselineTimeZone();
const root = fileURLToPath(new URL('../../', import.meta.url));
const { createElement } = createRequire(import.meta.url)('react') as typeof import('react');
const { renderToString } = createRequire(import.meta.url)('react-dom/server') as typeof import('react-dom/server');
const baseline = decode(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
type Recorded = (typeof baseline.plans)[number]['output'];

const DEFAULT_ADVICE =
  'Measure the dough after mixing to estimate how long bulk will take. The plan counts 78°F / 26°C as normal.';
const unescape = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&');
const first = (text: string, pattern: RegExp) => {
  const m = pattern.exec(text);
  return m ? unescape(m[1].trim()) : null;
};
const all = (text: string, pattern: RegExp) =>
  [...text.matchAll(new RegExp(pattern.source, 'g'))].map((m) =>
    m
      .slice(1)
      .map((x) => unescape(x.trim()))
      .join(' '),
  );
/** A recorded `2026-11-22 09:00 -08` as epoch milliseconds. */
const ms = (stamp: string) => {
  const [d, t, o] = stamp.split(' ');
  return Date.parse(`${d}T${t}:00${o}:00`);
};

/** What the rendered Schedule tab shows. */
function shown(html: string) {
  html = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<!-- -->/g, '');
  const start = html.indexOf('<section class="timeline-section"'),
    timeline = start < 0 ? '' : html.slice(start, html.indexOf('</section>', start));
  const steps = timeline
    .split('<div class="timeline-step ')
    .slice(1)
    .map((part) => {
      const classes = part.slice(0, part.indexOf('"')).trim().split(/\s+/),
        label = part.slice(0, part.indexOf('</label>'));
      return {
        id: first(part, /id="step-([^"]+)"/),
        at: first(part, /<time dateTime="([^"]+)"/),
        title: first(part, /for="step-[^"]+">([^<]*)/),
        phase: classes.find((c) => c.startsWith('phase-'))?.slice(6) ?? null,
        done: classes.includes('is-done'),
        skipped: classes.includes('is-skipped'),
        next: classes.includes('is-next'),
        badges: ['next-badge', 'skipped-badge', 'quiet-badge'].filter((b) => label.includes(b)),
        doneAt: /type="date"/.test(part)
          ? `${first(part, /type="date"[^>]*value="([^"]*)"/)} ${first(part, /type="time"[^>]*value="([^"]*)"/)}`
          : null,
        note: first(part, /<\/label>(?:<div class="done-at"[\s\S]*?<\/div>)?<p>([^<]*)<\/p>/),
        ready: first(part, /<p class="readiness-cue"><strong>Ready when:<\/strong>([^<]*)<\/p>/),
        gap: first(part, /<span class="step-gap"><span class="sr-only">Next step in <\/span>([^<]*)<\/span>/),
        advice: first(part, /<p class="bulk-advice"[^>]*>([^<]*)<\/p>/),
      };
    });
  const card = /<section class="now-card[^"]*" aria-label="Up next">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? null;
  return {
    steps,
    upNext:
      card === null
        ? null
        : {
            title: first(card, /<h2>([^<]*)<\/h2>/),
            countdown: first(card, /<span class="now-countdown">([^<]*)<\/span>/),
            at: first(card, /<time dateTime="([^"]+)"/),
            doughCheck: card.includes('Check the dough before this turn'),
            field: first(card, /for="now-dough-temp">([^<]*)<\/label>/),
            shift: first(card, /<p class="now-shift">([^<]*)<\/p>/),
            then: first(card, /<p>(Then: [^<]*)<\/p>/),
            advice: first(card, /<p class="bulk-advice[^"]*"[^>]*>([^<]*)<\/p>/),
          },
    ended: html.includes('This plan ended'),
    allDone: html.includes('All batches done'),
    noSchedule: html.includes('Choose a valid date, time'),
    daytimeProof: html.includes('class="notice overnight-warning"'),
    underway: html.includes('class="schedule-layout is-underway"'),
    quietHours: Number(first(html, /<h2>(\d+) (?:action needs|actions need) you during quiet hours<\/h2>/) ?? 0),
    checked: first(html, /(\d+ of \d+ steps checked)/),
    total: first(timeline, /<span>([^<]*) total<\/span>/),
    finish: html.includes('Baking complete')
      ? all(html, /<span>Baking complete<\/span><strong>([^<]*)<\/strong><small>([^<]*)<\/small>/)[0]
      : null,
    days: all(html, /<span class="day-number">(Day \d+)<\/span><h3>([^<]*)<\/h3>/),
    batches: first(html, /<strong>([^<]* batch(?:es)?)<\/strong>/),
    coldProof:
      all(
        html,
        /<strong>(Cold proof, [^<]*)<\/strong><\/div><p><span>([^<]*)<\/span><span>([^<]*)<\/span><\/p><span class="cold-proof-status">([^<]*)<\/span>/,
      )[0] ?? null,
  };
}

/** What the record says the Schedule tab shows, in the same terms, with the app's way of writing each time. */
function expected(input: PlanInput, out: Recorded) {
  const now = local(input.now),
    today = dateString(new Date(now)),
    v = out.view;
  const when = (stamp: string) =>
    stamp.slice(0, 10) === today ? stamp.slice(11, 16) : `${stamp.slice(0, 10)} at ${stamp.slice(11, 16)}`;
  const advice = v.advice === null ? null : v.advice.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2} [+-]\d{2}/g, when);
  const step = (id: string) => out.steps.find((s) => s.id === id)!;
  const field =
    v.upNext?.temperatureField === 'now'
      ? 'Dough temperature now'
      : v.upNext?.temperatureField === 'after mixing'
        ? 'Dough temperature after mixing'
        : null;
  // The timeline lists steps day by day, each day's steps in the plan's order, so a step moved onto another day shows under that day.
  const book = input.recipe === 'tartine',
    proof = v.coldProof,
    steps = v.days.flatMap((day) => out.steps.filter((s) => s.at.slice(0, 10) === day));
  return {
    steps: steps.map((s) => ({
      id: s.id,
      at: new Date(ms(s.at)).toISOString(),
      title: s.title,
      phase: s.phase,
      done: s.state === 'done',
      skipped: s.state === 'skipped',
      next: s.state === 'next',
      badges: [
        ...(s.state === 'next' ? ['next-badge'] : []),
        ...(s.state === 'skipped' ? ['skipped-badge'] : []),
        ...(s.quiet ? ['quiet-badge'] : []),
      ],
      doneAt: s.state === 'done' && s.actual ? `${s.actual.slice(0, 10)} ${s.actual.slice(11, 16)}` : null,
      note: s.note ?? null,
      ready: s.ready ?? null,
      gap: s.gap > 0 ? durationText(s.gap) : null,
      advice: s.id === 'rest' ? (advice ?? DEFAULT_ADVICE) : null,
    })),
    upNext:
      v.upNext === null
        ? null
        : {
            title: step(v.upNext.id).title,
            countdown: v.upNext.countdown,
            at: new Date(ms(step(v.upNext.id).at)).toISOString(),
            doughCheck: v.upNext.doughCheck,
            field,
            shift: v.shift !== 0 ? v.shiftText : null,
            then:
              v.upNext.then === null ? null : `Then: ${step(v.upNext.then).title} · ${when(step(v.upNext.then).at)}`,
            advice: field === 'Dough temperature now' ? advice : field ? (advice ?? DEFAULT_ADVICE) : null,
          },
    ended: v.stale && v.finish !== null,
    allDone: v.allDone,
    noSchedule: steps.length === 0,
    daytimeProof: !book && proof !== null && !proof.overnight,
    underway: v.underway,
    quietHours: v.quietHours,
    checked: `${v.checked} of ${steps.length} steps checked`,
    total: `${v.totalTime ?? 'Set a date and time'}`,
    finish: v.finish === null ? null : `${v.finish.slice(11, 16)} ${v.finish.slice(0, 10)}`,
    days: v.days.map((d, i) => `Day ${i + 1} ${d}`),
    batches: `${v.batches ?? Infinity} ${v.batches === 1 ? 'batch' : 'batches'}`,
    coldProof:
      book || proof === null
        ? null
        : `Cold proof, ${durationText(proof.minutes)} ${proof.start.slice(0, 10)} at ${proof.start.slice(11, 16)} to ${proof.end.slice(0, 10)} at ${proof.end.slice(11, 16)} ${proof.overnight ? 'Overnight cold ferment' : 'Daytime proof with this start time'}`,
  };
}

/** A plan reaches the screen only through saved data, which loading may correct. Cases whose saved form loads differently can't be shown as recorded. */
function savedAs(input: PlanInput) {
  const state = plannerState(input),
    saved = serialize(state);
  return { saved, reachable: isDeepStrictEqual(state, fromV6(JSON.parse(saved), local(input.now))) };
}

/** Recorded plans that saved data can't hold, so the screen never shows them as recorded. Loading corrects each one. */
const NOT_REACHABLE = [
  'a time without a leading zero',
  'a fractional loaf count',
  'zero loaves',
  'zero loaves baked at once',
];

test(`App.tsx shows every reachable recorded plan as the record says (${baseline.plans.length} plans)`, async () => {
  const vite = await createServer({
    root,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    resolve: { alias: { '@': `${root}src` } },
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { default: App } = (await vite.ssrLoadModule('/src/App.tsx')) as { default: () => unknown };
    const storage = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, String(v));
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
    };
    const unreachable: string[] = [],
      changed: string[] = [];
    for (const { name, input, output } of baseline.plans) {
      const { saved, reachable } = savedAs(input);
      if (!reachable) {
        unreachable.push(name);
        continue;
      }
      storage.set(STORAGE_V6, saved);
      const html = atMoment(local(input.now), () => renderToString(createElement(App as never)), true);
      const d = difference(expected(input, output), shown(html), 'screen');
      if (d) changed.push(`${name}: ${d}`);
    }
    assert.deepEqual(unreachable, NOT_REACHABLE, 'the recorded plans that saved data cannot hold');
    assert.equal(
      changed.length,
      0,
      `${changed.length} of ${baseline.plans.length - unreachable.length} plans show something else:\n${changed.slice(0, 10).join('\n')}${changed.length > 10 ? `\n…and ${changed.length - 10} more` : ''}`,
    );
  } finally {
    await vite.close();
  }
});
