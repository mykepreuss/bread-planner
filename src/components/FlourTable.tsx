import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FLOUR_NAMES } from '@/domain/recipes';
import { formula } from '@/domain/formula';
import { selected } from '@/state/schema';
import { usePlanner } from './calculator';
import { SettingField } from './NumberField';
import { g } from './text';

/** The flour blend: each flour's parts, and what they come to in this batch. */
export function FlourTable() {
  const { state } = usePlanner(),
    { recipe, settings } = selected(state),
    r = formula(recipe, settings);
  return (
    <Table className="flour-table">
      <TableHeader>
        <TableRow>
          <TableHead>Flour</TableHead>
          <TableHead>Blend parts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipe.flours.map((key) => {
          const flour = r?.flours.find((f) => f.key === key),
            grams = flour?.grams ?? 0,
            percent = flour?.percent ?? 0;
          return (
            <TableRow key={key}>
              <TableCell>
                <span className="flour-name">
                  {FLOUR_NAMES[key]}
                  <small>{grams > 0 ? `${g(grams)} g in this batch · ${g(percent)}%` : 'Optional · not used'}</small>
                </span>
              </TableCell>
              <TableCell>
                <SettingField
                  compact
                  spec={{ cell: `flour_${key}`, label: `${FLOUR_NAMES[key]} proportion`, unit: 'parts' }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
