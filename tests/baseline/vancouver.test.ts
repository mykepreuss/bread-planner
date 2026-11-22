import test from 'node:test';
import assert from 'node:assert/strict';
import { VancouverDate } from './vancouver.ts';

/**
 * VancouverDate against the real America/Vancouver zone, for every date operation the app and the baseline use. It
 * runs wherever the host has the zone (`npm test` starts Node with TZ=America/Vancouver); on Vercel's build machines,
 * which lack it and use VancouverDate instead, it is skipped.
 */
const native =
  new Date('2026-07-01T12:00:00').getTimezoneOffset() === 420 &&
  new Date('2026-12-01T12:00:00').getTimezoneOffset() === 480;
const reason = native
  ? undefined
  : 'this host cannot apply America/Vancouver, so there is no real zone to compare with';
const MINUTE = 60000;
const getters = [
  'getTimezoneOffset',
  'getFullYear',
  'getMonth',
  'getDate',
  'getDay',
  'getHours',
  'getMinutes',
  'getSeconds',
  'getMilliseconds',
] as const;
/** Every 15 minutes through 2026, the first days of 2027 and the start of 2030 (where saved data is loaded in the record). */
function* instants() {
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 4); t += 15 * MINUTE) yield t;
  for (let t = Date.UTC(2029, 11, 30); t < Date.UTC(2030, 0, 4); t += 15 * MINUTE) yield t;
}

test('VancouverDate reads every instant as the real zone does', { skip: reason }, () => {
  let checked = 0;
  for (const t of instants()) {
    const real = new Date(t),
      ours = new VancouverDate(t);
    for (const g of getters) {
      assert.equal(ours[g](), real[g](), `${g} at ${real.toISOString()}`);
      checked++;
    }
  }
  assert.ok(checked > 300000, `only ${checked} checks`);
});

test(
  'VancouverDate turns every wall-clock time into the instant the real zone does, including the skipped and repeated hours',
  { skip: reason },
  () => {
    for (const t of instants()) {
      const w = new Date(t),
        y = w.getUTCFullYear(),
        mo = w.getUTCMonth(),
        d = w.getUTCDate(),
        h = w.getUTCHours(),
        mi = w.getUTCMinutes();
      const text = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
      assert.equal(new VancouverDate(y, mo, d, h, mi).getTime(), new Date(y, mo, d, h, mi).getTime(), `parts ${text}`);
      for (const s of [text, `${text}:00`])
        (assert.equal(new VancouverDate(s).getTime(), new Date(s).getTime(), `text ${s}`),
          assert.equal(VancouverDate.parse(s), Date.parse(s), `parse ${s}`));
    }
  },
);

test('VancouverDate rejects and rolls over invalid times exactly as the real Date does', { skip: reason }, () => {
  for (const s of [
    '2026-02-31T09:00:00',
    '2026-02-29T09:00:00',
    '2026-10-21T25:00:00',
    '2026-10-21T24:00:00',
    '2026-10-21T23:60:00',
    '2026-13-01T09:00:00',
    '2026-00-10T09:00:00',
    '2026-10-21T9:00:00',
    '2026-11-22',
    '2026-11-22T09:00:00Z',
    '2026-11-22T09:00:00-08:00',
    'garbage',
  ])
    assert.ok(
      Object.is(new VancouverDate(s).getTime(), new Date(s).getTime()),
      `${s}: ${new VancouverDate(s).getTime()} vs ${new Date(s).getTime()}`,
    );
  for (const parts of [
    [2026, 1, 31, 9, 0],
    [2026, 11, 31, 24, 0],
    [2026, 2, 8, 2, 30],
    [2026, 10, 1, 1, 30],
    [2026, 10, 1, 2, 0],
    [2026, 0, 0, 0, 0],
  ] as [number, number, number, number, number][])
    assert.equal(new VancouverDate(...parts).getTime(), new Date(...parts).getTime(), parts.join(','));
  assert.ok(
    Number.isNaN(new VancouverDate(Number.NaN).getHours()) &&
      Number.isNaN(new VancouverDate(Number.NaN).getTimezoneOffset()),
  );
});

test('VancouverDate moves the day as the real zone does, across both changes', { skip: reason }, () => {
  for (let t = Date.UTC(2026, 0, 1, 8); t < Date.UTC(2027, 0, 1); t += 37 * 15 * MINUTE)
    for (const step of [1, -1, 30]) {
      const real = new Date(t),
        ours = new VancouverDate(t);
      assert.equal(
        ours.setDate(ours.getDate() + step),
        real.setDate(real.getDate() + step),
        `${new Date(t).toISOString()} by ${step} days`,
      );
    }
});
