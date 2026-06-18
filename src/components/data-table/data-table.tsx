"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ----------------------- En-tête de colonne triable ----------------------- */

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: import("@tanstack/react-table").Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={cn("font-mono text-[10px] uppercase tracking-eyebrow text-ardoise", className)}>{title}</span>;
  }
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className={cn("group inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise transition-colors hover:text-encre", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ChevronUp className="h-3 w-3 text-lapis" strokeWidth={2} />
      ) : sorted === "desc" ? (
        <ChevronDown className="h-3 w-3 text-lapis" strokeWidth={2} />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40 group-hover:opacity-70" strokeWidth={1.5} />
      )}
    </button>
  );
}

/* ----------------------- Colonne de sélection (cases à cocher) ----------------------- */

export function createSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Sélectionner toutes les lignes de la page"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Sélectionner la ligne"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

/* ------------------------------ Toolbar ------------------------------ */

export function DataTableToolbar({
  table,
  searchKey,
  searchPlaceholder = "Rechercher…",
  children,
}: {
  table: import("@tanstack/react-table").Table<unknown>;
  searchKey?: string;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  const value = searchKey ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? "" : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {searchKey && (
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
          <Input
            placeholder={searchPlaceholder}
            value={value}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      )}
      {children}
      {/* Colonnes visibles */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto h-9">
            Colonnes <ChevronDown className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Afficher / masquer</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter((c) => typeof c.accessorFn !== "undefined" || c.id !== "select")
            .filter((c) => c.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ------------------------------ Pagination ------------------------------ */

export function DataTablePagination({ table }: { table: import("@tanstack/react-table").Table<unknown> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-ligne px-4 py-3">
      <p className="text-xs text-ardoise">
        {total === 0 ? "Aucun résultat" : <>Affichage de <span className="font-mono text-encre">{from}</span>–<span className="font-mono text-encre">{to}</span> sur <span className="font-mono text-encre">{total}</span></>}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ardoise">Lignes</span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 8, 10, 20, 50].map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="Première page">
            <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Page précédente">
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
          <span className="px-2 font-mono text-xs text-encre">{pageIndex + 1} / {table.getPageCount() || 1}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Page suivante">
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Dernière page">
            <ChevronsRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ DataTable ------------------------------ */

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  /** Render-prop recevant l'instance de table — pour des filtres custom (Selects, etc.) */
  toolbar?: (table: import("@tanstack/react-table").Table<TData>) => React.ReactNode;
  /** Render-prop affiché quand des lignes sont sélectionnées (barre d'actions de masse) */
  selectionBar?: (table: import("@tanstack/react-table").Table<TData>) => React.ReactNode;
  emptyState?: React.ReactNode;
  pageSize?: number;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  toolbar,
  selectionBar,
  emptyState,
  pageSize = 8,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    initialState: { pagination: { pageSize } },
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchKey && (
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        )}
        {toolbar?.(table)}
        {/* Colonnes visibles */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9">
              Colonnes <ChevronDown className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Afficher / masquer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Barre d'actions de masse — visible quand des lignes sont sélectionnées */}
      {selectedCount > 0 && selectionBar && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-lapis/30 bg-lapis/5 px-4 py-2.5">
          <span className="font-mono text-xs font-semibold text-lapis">
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {selectionBar(table)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 text-ardoise hover:text-encre"
            onClick={() => table.resetRowSelection()}
          >
            Désélectionner
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-ligne bg-blanc">
        <div className="overflow-x-auto scroll-fine">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent border-ligne">
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="h-11">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-ligne hover:bg-porcelaine/60">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    {emptyState ?? (
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-6 w-6 text-ardoise/40" strokeWidth={1.5} />
                        <p className="text-sm text-ardoise">Aucun résultat.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <DataTablePagination table={table as unknown as import("@tanstack/react-table").Table<unknown>} />
      </div>
    </div>
  );
}
