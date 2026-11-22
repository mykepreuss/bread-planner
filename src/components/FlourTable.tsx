import { useMemo } from 'react';
import { useTable, tableFeatures, flexRender, type ColumnDef } from '@tanstack/react-table';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { definitions, flourNames, calculateRecipe, type Planner } from '@/lib/recipes';
import { NumberField } from './NumberField';
import { g } from './text';

const features = tableFeatures({});
/** The flour blend: each flour's parts, and what they come to in this batch. */
export function FlourTable({ values }: { values: Planner }) {
  const r = calculateRecipe(values),
    d = definitions[values.recipe];
  const rows = d.flours.map((key) => ({
    key,
    grams: r?.flours.find((f) => f.key === key)?.grams ?? 0,
    percent: r?.flours.find((f) => f.key === key)?.percent ?? 0,
  }));
  type Row = (typeof rows)[number];
  const columns = useMemo<ColumnDef<typeof features, Row>[]>(
    () => [
      {
        id: 'flour',
        header: 'Flour',
        cell: (ctx) => (
          <span className="flour-name">
            {flourNames[ctx.row.original.key]}
            <small>
              {ctx.row.original.grams > 0
                ? `${g(ctx.row.original.grams)} g in this batch · ${g(ctx.row.original.percent)}%`
                : 'Optional · not used'}
            </small>
          </span>
        ),
      },
      {
        id: 'parts',
        header: 'Blend parts',
        cell: (ctx) => (
          <NumberField
            compact
            spec={{
              key: ctx.row.original.key,
              cell: `flour_${ctx.row.original.key}`,
              label: `${flourNames[ctx.row.original.key]} proportion`,
              value: 0,
              unit: 'parts',
            }}
          />
        ),
      },
    ],
    [],
  );
  const table = useTable({ features, columns, data: rows });
  return (
    <Table className="flour-table">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((h) => (
              <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
