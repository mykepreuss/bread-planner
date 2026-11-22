/**
 * The saved plans the browser baseline opens (saved-plans.json). Each is a version 5 save as the live site wrote it
 * until step 3b of the rebuild, with the moment the page's clock is frozen at. Opening them also checks that such a
 * save upgrades to version 6 and shows the same screen. The code that built them was deleted in step 3c, so the file
 * is kept as it is; see this file in git history before step 3c for how each was made. A new screen can add a version
 * 6 save made with `serialize` from src/state/load.ts.
 */
export type SavedPlan = { name: string; about: string; now: string; saved: unknown };
