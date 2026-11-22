import { createContext, useContext } from 'react';
import { useForm } from '@tanstack/react-form';
import { createPlanner, restorePlanner, type Planner } from '@/lib/recipes';

/** Where the planner is saved in the browser. */
export const STORAGE = 'bread-planner.v5';
/** The saved plan, or a fresh one when nothing usable is saved. */
export function loadPlan(): Planner {
  try {
    return restorePlanner(JSON.parse(localStorage.getItem(STORAGE) || 'null'));
  } catch {
    return createPlanner();
  }
}
export function useCalculator(initial: Planner) {
  return useForm({ defaultValues: initial });
}
export type Calculator = ReturnType<typeof useCalculator>;
/** The planner's form, shared with every part of the screen that edits it. */
export const FormContext = createContext<Calculator | null>(null);
export function useCalc() {
  const form = useContext(FormContext);
  if (!form) throw new Error('Calculator unavailable');
  return form;
}
