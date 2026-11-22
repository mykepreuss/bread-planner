import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Scale } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { recipeById } from '@/domain/recipes';
import { STORAGE_V6, loadState, serialize } from '@/state/load';
import { freshState, selected } from '@/state/schema';
import { selectRecipe } from '@/state/actions';
import { PlannerContext } from '@/components/calculator';
import { ScheduleTab } from '@/components/ScheduleTab';
import { IngredientsTab } from '@/components/IngredientsTab';
import { MethodGuide } from '@/components/MethodGuide';

/** The saved planner. When browser storage can't be read the planner starts fresh. */
function load() {
  try {
    return loadState((key) => localStorage.getItem(key), Date.now());
  } catch {
    return freshState(Date.now());
  }
}

/** The planner: the tabs, the recipe menu and the method guide. It loads the saved plan once and saves every change. */
function App() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState('schedule');
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_V6, serialize(state));
    } catch {
      /* Keep the planner usable when browser storage is unavailable. */
    }
  }, [state]);
  const planner = useMemo(() => ({ state, update: setState }), [state]);
  const { recipe } = selected(state),
    book = recipe.method === 'tartine';
  return (
    <TooltipProvider>
      <PlannerContext.Provider value={planner}>
        <div className="app-shell">
          <Tabs value={tab} onValueChange={setTab} className="main-tabs">
            <div className="nav-row">
              <TabsList className="nav-tabs">
                <TabsTrigger value="schedule">
                  <CalendarDays /> Schedule
                </TabsTrigger>
                <TabsTrigger value="formula">
                  <Scale /> Ingredients
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="recipe-switch">
              <div>
                <Label htmlFor="recipe-choice">Recipe</Label>
                <Select value={state.recipe} onValueChange={(id) => setState((s) => selectRecipe(s, id))}>
                  <SelectTrigger id="recipe-choice" aria-label="Recipe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.order.map((id) => (
                      <SelectItem value={id} key={id}>
                        {recipeById(id)!.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p>{recipe.description}</p>
            </div>
            <TabsContent value="schedule">
              <ScheduleTab onViewIngredients={() => setTab('formula')} />
            </TabsContent>
            <TabsContent value="formula">
              <IngredientsTab />
            </TabsContent>
          </Tabs>
          <MethodGuide book={book} />
        </div>
      </PlannerContext.Provider>
    </TooltipProvider>
  );
}
export default App;
