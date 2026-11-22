import { useEffect, useState } from 'react';
import { useSelector } from '@tanstack/react-form';
import { CalendarDays, Scale } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { definitions, recipeDefaults } from '@/lib/recipes';
import { FormContext, STORAGE, loadPlan, useCalculator } from '@/components/calculator';
import { ScheduleTab } from '@/components/ScheduleTab';
import { IngredientsTab } from '@/components/IngredientsTab';
import { MethodGuide } from '@/components/MethodGuide';

/** The planner: the tabs, the recipe menu and the method guide. It loads the saved plan once and saves every change. */
function App() {
  const [initial] = useState(loadPlan),
    form = useCalculator(initial),
    values = useSelector(form.store, (s) => s.values);
  const [tab, setTab] = useState('schedule');
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ version: 5, plan: values }));
    } catch {
      /* Keep the calculator usable when browser storage is unavailable. */
    }
  }, [values]);
  const definition = definitions[values.recipe],
    book = definition.method === 'tartine';
  function resetRecipe() {
    form.setFieldValue('recipes', { ...values.recipes, [values.recipe]: recipeDefaults(values) });
  }
  return (
    <TooltipProvider>
      <FormContext.Provider value={form}>
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
                <Select value={values.recipe} onValueChange={(v) => form.setFieldValue('recipe', v)}>
                  <SelectTrigger id="recipe-choice" aria-label="Recipe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {values.order.map((id) => (
                      <SelectItem value={id} key={id}>
                        {definitions[id].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p>{definition.description}</p>
            </div>
            <TabsContent value="schedule">
              <ScheduleTab values={values} onViewIngredients={() => setTab('formula')} />
            </TabsContent>
            <TabsContent value="formula">
              <IngredientsTab values={values} onReset={resetRecipe} />
            </TabsContent>
          </Tabs>
          <MethodGuide book={book} />
        </div>
      </FormContext.Provider>
    </TooltipProvider>
  );
}
export default App;
