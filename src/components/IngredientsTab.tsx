import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { FLOUR_NAMES } from '@/domain/recipes';
import { addInLines, isWeighed } from '@/domain/addins';
import { mixingBowls } from '@/domain/schedule';
import { formula, totalHydration } from '@/domain/formula';
import { selected } from '@/state/schema';
import { restoreDefaults, setTotalHydration } from '@/state/actions';
import { usePlanner } from './calculator';
import { Panel } from './Panel';
import { FieldGroup, NumberField, spec } from './NumberField';
import { FlourTable } from './FlourTable';
import { g, loafText } from './text';

/** A list of ingredient weights, with an optional total. */
function Weights({ rows, totalLabel, total }: { rows: [string, number][]; totalLabel?: string; total?: number }) {
  return (
    <dl className="weights">
      {rows.map(([name, amount]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>
            {g(amount)} <span>g</span>
          </dd>
        </div>
      ))}
      {total !== undefined && (
        <div className="weight-total">
          <dt>{totalLabel || 'Total'}</dt>
          <dd>
            {g(total)} <span>g</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

/** The leaven made, used in the dough, and kept or still needed. */
function LeavenBalance({
  made,
  used,
  reserve,
  shortfall,
}: {
  made: number;
  used: number;
  reserve: number;
  shortfall: number;
}) {
  return (
    <div className={`leaven-balance${shortfall > 0 ? ' is-short' : ''}`} aria-label="Leaven balance">
      <div>
        <span>Made</span>
        <strong>{g(made)} g</strong>
      </div>
      <div>
        <span>Used in dough</span>
        <strong>{g(used)} g</strong>
      </div>
      <div>
        <span>{shortfall > 0 ? 'Short by' : 'Reserved'}</span>
        <strong>{g(shortfall > 0 ? shortfall : reserve)} g</strong>
      </div>
    </div>
  );
}
/** The Ingredients tab: the batch, the flour blend, the leaven and the weights for each stage. */
export function IngredientsTab() {
  const { state, update } = usePlanner(),
    { recipe: d, settings: p } = selected(state),
    r = formula(d, p),
    // The book's Tartine method has the leaven in the initial mix; a Tartine recipe with its own autolyse doesn't.
    book = d.method === 'tartine' && !d.autolyse;
  const buildFlour = FLOUR_NAMES[d.buildFlour];
  // Mixed in several bowls, each stage lists one bowl's weights; see `mixingBowls`.
  const bowls = mixingBowls(p.count, state.mixCapacity),
    eachBowl = bowls > 1 ? ` Weights for each of ${bowls} bowls.` : '',
    inBowl = (rows: [string, number][]): [string, number][] => rows.map(([name, n]) => [name, n / bowls]);
  return (
    <>
      <div className="formula-layout">
        <div className="form-stack">
          <Panel title="Your batch" description="Each recipe remembers its own settings.">
            <FieldGroup
              specs={[
                spec('count', 'Number of loaves', 'loaves', 1, 1),
                spec('weight', 'Dough weight per loaf', 'g', 1),
              ]}
            />
            <div className="hydration-control">
              <NumberField
                spec={spec('hydration', 'Total hydration', '%', 0, 1)}
                value={Math.round(totalHydration(p))}
                min={Math.ceil(totalHydration({ ...p, hydration: 0 }))}
                onChange={(n) => update((s) => setTotalHydration(s, n))}
              />
              <p className="field-note">Includes the flour and water in the leaven used.</p>
            </div>
          </Panel>
          <Panel
            title="Flour blend"
            description="Parts set the balance between flours. The gram weights scale to your batch."
          >
            <FlourTable />
            {!r && (
              <p className="notice" role="alert">
                Add at least one flour part to calculate this recipe.
              </p>
            )}
          </Panel>
          <Accordion type="multiple" className="recipe-settings">
            <AccordionItem value="formula">
              <AccordionTrigger>Leaven, salt & water split</AccordionTrigger>
              <AccordionContent>
                <FieldGroup
                  specs={[
                    spec('leaven', 'Leaven / added flour', '%'),
                    spec('salt', 'Salt / added flour', '%'),
                    spec('reserve', 'Water reserved for final mix', '%'),
                  ]}
                />
                <p className="field-note">The water split is a percentage of total added water.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="build">
              <AccordionTrigger>Leaven build</AccordionTrigger>
              <AccordionContent>
                <p className="field-note build-description">
                  Build quantities per 1,000 g added flour. The amounts made scale with your batch. Mature starter is
                  equal weights flour and water. If the build is empty, the leaven is treated as 100% hydration.
                </p>
                <FieldGroup
                  specs={[
                    spec('buildSeed', 'Mature starter', 'g'),
                    spec('buildBread', buildFlour, 'g'),
                    spec('buildWheat', 'Whole-wheat flour', 'g'),
                    spec('buildWater', 'Water', 'g'),
                  ]}
                />
                {r && (
                  <>
                    <div className="detail-divider" />
                    <Weights
                      rows={['Mature starter', buildFlour, 'Whole-wheat flour', 'Water'].map((label, i) => [
                        label,
                        r.madeParts[i],
                      ])}
                      total={r.made}
                    />
                    <LeavenBalance made={r.made} used={r.used} reserve={r.reserve} shortfall={r.shortfall} />
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="defaults">
              <AccordionTrigger>Recipe defaults</AccordionTrigger>
              <AccordionContent>
                <div className="recipe-recovery">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <RotateCcw /> Restore recipe defaults
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore {d.name} defaults?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This resets this recipe's quantities and checklist. The other recipes, your schedule and oven
                          settings are retained.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep my changes</AlertDialogCancel>
                        <AlertDialogAction onClick={() => update(restoreDefaults)}>Restore defaults</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="result-stack">
          {r ? (
            <>
              <Card className="formula-result">
                <CardContent>
                  <div className="result-total" aria-live="polite">
                    {g(r.total)}
                    <span>g</span>
                  </div>
                  <p>Total dough for {loafText(p.count)}</p>
                  <div className="result-metrics">
                    <span>
                      {Math.round(r.totalHydration)}%<small>total hydration</small>
                    </span>
                    <span>
                      {g(p.weight)} g<small>per loaf</small>
                    </span>
                  </div>
                </CardContent>
              </Card>
              {r.shortfall > 0 && (
                <p className="notice" role="alert">
                  Make {g(r.shortfall)} g more leaven before mixing. Increase the leaven build.
                </p>
              )}
              <Panel
                title={book ? '01 / Initial mix and rest' : '01 / Autolyse'}
                description={`${
                  book
                    ? 'Leaven goes into this mix before the initial rest.'
                    : 'Mix the flour and first water addition. Keep the final-mix ingredients separate.'
                }${eachBowl}`}
              >
                <Weights rows={inBowl(r.initial)} />
              </Panel>
              <Panel
                title={book ? '02 / Salt and remaining water' : '02 / Final mix'}
                description={`${
                  book
                    ? 'Add after the initial rest, then begin bulk fermentation.'
                    : 'Add after the autolyse, once the leaven is ready.'
                }${eachBowl}`}
              >
                <Weights rows={inBowl(r.final)} />
              </Panel>
              {d.addIns && (
                <Panel
                  title="03 / Add-ins"
                  description={`Work in after ${(d.addIns.afterTurn ?? 1) === 1 ? 'the first turn' : `Turn ${d.addIns.afterTurn}`}. The book's ${d.addIns.items.some(isWeighed) ? 'weights' : 'measures'}, scaled to your batch.`}
                >
                  <ul className="add-ins">
                    {addInLines(d.addIns, p, d.defaults, r.flour).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <div className="recipe-totals">
                <span>
                  <strong>{g(r.flour)} g</strong> added flour
                </span>
                <span>
                  <strong>{g(r.water)} g</strong> added water
                </span>
                <span>
                  <strong>{g(r.used)} g</strong> leaven used
                </span>
              </div>
            </>
          ) : (
            <p className="notice" role="alert">
              Set a flour blend to calculate the recipe.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
