import { createContext, useContext } from 'react';
import type { PlannerState } from '@/state/schema';

/** Applies a change: a function from the planner's state to the next one, such as those in src/state/actions.ts. */
export type Update = (change: (state: PlannerState) => PlannerState) => void;

/** The planner's state and how to change it, shared with every part of the screen. */
export const PlannerContext = createContext<{ state: PlannerState; update: Update } | null>(null);
export function usePlanner() {
  const planner = useContext(PlannerContext);
  if (!planner) throw new Error('Planner unavailable');
  return planner;
}
