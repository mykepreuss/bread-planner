/**
 * How long each stage takes, in minutes. These were cells of the source spreadsheet (House) and the book's times
 * (Tartine); there is no editor, so they are constants. Bulk runs from its start to preshape, with a turn every 30
 * minutes in between.
 */
export const HOUSE = {
  feed: 660,
  leaven: 300,
  /**
   * The autolyse runs the leaven's last 90 minutes. Michael's change on November 22, 2026 (decision 15): it was 270,
   * from 30 minutes after the leaven started. Both autolyse guides he reviewed put mostly white flour at 2 hours or less.
   */
  autolyse: 90,
  mix: 15,
  turnEvery: 30,
  turns: 7,
  preshape: 10,
  bench: 30,
  shape: 5,
  /** The sheet's 5-minute rest after shaping and 15-minute basket rest, now one basket rest. */
  basket: 20,
  fridge: 750,
  /** The loaves warm up while the oven and pots preheat. */
  preheat: 60,
  covered: 20,
  uncovered: 23,
  preheatTo: '540°F / 282°C',
  bakeAt: '460°F / 238°C',
} as const;

export const TARTINE = {
  leaven: 720,
  /** The rest after the initial mix. A recipe's `initialMix` can set its own (see recipes.ts). */
  rest: 30,
  turnEvery: 30,
  bulk: 180,
  preshape: 5,
  bench: 30,
  shape: 5,
  cold: 720,
  warm: 210,
  warmup: 60,
  preheat: 30,
  covered: 20,
  uncovered: 20,
  preheatTo: '500°F / 260°C',
  bakeAt: '450°F / 232°C',
} as const;

/** Every loaf cools for 15 minutes before slicing. */
export const COOLING = 15;
