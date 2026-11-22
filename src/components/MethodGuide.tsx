import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

/** The guide below the tabs: readiness, starting a starter, and shaping and baking. `book` is the Tartine recipe, which leaves out the House-method paragraph. */
export function MethodGuide({ book }: { book: boolean }) {
  return (
    <Accordion type="multiple" className="method-guide">
      <AccordionItem value="ready">
        <AccordionTrigger>Mature starter and readiness guide</AccordionTrigger>
        <AccordionContent>
          <div className="guide-copy">
            <p>
              <strong>Start with an established starter.</strong> This bake schedule assumes your starter already rises
              and falls predictably after feeding. It does not include the initial week of starter establishment.
            </p>
            <p>
              <strong>Leaven:</strong> look for an aerated, puffy build. A spoonful should float in room-temperature
              water. If it sinks, ferment longer before mixing.
            </p>
            <p>
              <strong>Bulk:</strong> keep covered at 75°F to 80°F / 24°C to 27°C. Fold all four sides with a wet hand
              every half-hour. The book calls for a billowy dough with 20% to 30% volume increase after about three
              hours; if needed, allow up to another hour with folds. Allow more time when the dough needs it.
            </p>
            <p>
              <strong>Proof and bake:</strong> the book gives 3 to 4 hours warm, or 10 to 12 hours refrigerated with a
              return to room temperature. Later serial batches may spend longer chilled or waiting to bake. Judge the
              dough's condition as well as the planned times.
            </p>
            <p>
              <strong>Crust and cooling:</strong> bake uncovered until rich golden brown, extending the time if needed.
              The base should sound hollow when tapped. Move to a rack and cool at least 15 minutes before slicing.
            </p>
            {!book && (
              <p>
                This recipe uses a separate flour-and-water autolyse, followed by the final mix and an overnight cold
                proof. Work the first three turns vigorously, going around all four sides twice, to build gluten
                structure early; later turns are a single round. The dated schedule shows when to refrigerate and bake.
              </p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="starter">
        <AccordionTrigger>Establishing a starter from scratch</AccordionTrigger>
        <AccordionContent>
          <div className="guide-copy">
            <p>
              Make a reserve of equal weights white-bread and whole-wheat flour, such as 1,000 g of each. It covers
              repeated feedings, not one dough batch.
            </p>
            <p>
              In a jar, mix 100 g warm water, about 80°F / 27°C, with 100 g of the flour blend. Cover with a towel and
              leave at room temperature for 2 to 3 days, looking for bubbling and expansion.
            </p>
            <p>
              Once active, feed at the same time daily: discard 80%, then add equal weights warm water and flour blend,
              such as 50 g of each. Allow about a week for predictable rises and falls and a slightly sour smell before
              building the leaven for bread.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="shaping">
        <AccordionTrigger>Shaping, basket preparation and baking</AccordionTrigger>
        <AccordionContent>
          <div className="guide-copy">
            <p>
              <strong>Preshape:</strong> dust the dough top, divide equally and turn flour-side down. Bring cut edges
              onto themselves and work each piece into a taut round, keeping dusting flour on the outside. Cover and
              bench-rest for 30 minutes.
            </p>
            <p>
              <strong>Baskets:</strong> use rice flour, about 200 g for the two-loaf book batch. Line baskets or bowls
              with towels, flour generously, and keep the unused rice flour.
            </p>
            <p>
              <strong>Final shape:</strong> dust and flip each round flour-side down. Stretch the bottom corners toward
              you and fold into the middle; repeat from both sides and the top. Roll seam-side down into a taut round.
              Transfer to a basket seam-side up and cover for the selected proof.
            </p>
            <p>
              <strong>Hot pots:</strong> preheat lidded Dutch ovens inside the oven. Dust loaf tops, carefully turn into
              the hot pots seam-side down, score with a lame or razor, cover and lower to the bake temperature. Remove
              lids carefully for the uncovered bake because steam may escape.
            </p>
            <p>
              <strong>Next batch:</strong> remove baked loaves to a rack, clean the pots and reheat them with their lids
              at the preheat temperature. Wait until they are hot before loading. Keep later refrigerated loaves chilled
              until their own warm-up; bake only as many as your capacity setting allows.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
