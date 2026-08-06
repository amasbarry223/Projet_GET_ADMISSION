"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, MoreHorizontal, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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

/* ----------------------- Colonne Actions (dropdown menu cohérent) ----------------------- */

export type ActionItem<TData> = {
  label: string | ((row: TData) => string);
  icon: React.ElementType;
  tone?: "default" | "danger";
  /** Masquer l'action pour certaines lignes */
  hidden?: (row: TData) => boolean;
  /** Désactiver l'action pour certaines lignes (visible mais non cliquable) */
  disabled?: (row: TData) => boolean;
  /** Raison affichée (tooltip natif) quand l'action est désactivée */
  disabledReason?: (row: TData) => string | undefined;
  /** Action directe (toast, navigation, etc.) */
  onClick?: (row: TData) => void;
  /** Action nécessitant confirmation (destructive / irréversible) — ouvre un AlertDialog */
  confirm?: {
    title: string;
    description: string | ((row: TData) => string);
    confirmLabel?: string;
    onConfirm: (row: TData) => void;
  };
};

export function createActionsColumn<TData>(
  actions: ActionItem<TData>[],
  options?: { ariaLabel?: (row: TData) => string }
): ColumnDef<TData> {
  return {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const ariaLabel = options?.ariaLabel?.(row.original);
      return (
        <RowActions
          row={row.original}
          actions={actions}
          {...(ariaLabel !== undefined ? { ariaLabel } : {})}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}

function RowActions<TData>({ row, actions, ariaLabel }: { row: TData; actions: ActionItem<TData>[]; ariaLabel?: string }) {
  const visible = actions.filter((a) => !a.hidden?.(row));
  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-ardoise hover:bg-porcelaine hover:text-encre" aria-label={ariaLabel ?? "Actions sur la ligne"}>
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {visible.map((action, i) => {
            const label = typeof action.label === "function" ? action.label(row) : action.label;
            const isDisabled = action.disabled?.(row) ?? false;
            const disabledReason = isDisabled ? action.disabledReason?.(row) : undefined;

            if (isDisabled) {
              return (
                <DropdownMenuItem
                  key={i}
                  disabled
                  title={disabledReason}
                  className="gap-2 text-sm"
                  onSelect={(e) => e.preventDefault()}
                >
                  <action.icon className="h-4 w-4" strokeWidth={1.5} /> {label}
                </DropdownMenuItem>
              );
            }

            return action.confirm ? (
              <AlertDialog key={i}>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className={cn("gap-2 text-sm", action.tone === "danger" && "text-carmin focus:text-carmin")}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <action.icon className="h-4 w-4" strokeWidth={1.5} /> {label}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-blanc">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-lg flex items-center gap-2">
                      {action.tone === "danger" ? <AlertTriangle className="h-5 w-5 text-carmin" strokeWidth={1.5} /> : <Info className="h-5 w-5 text-lapis" strokeWidth={1.5} />}
                      {action.confirm.title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-ardoise">
                      {typeof action.confirm.description === "function" ? action.confirm.description(row) : action.confirm.description}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-porcelaine">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className={cn(action.tone === "danger" ? "bg-carmin text-blanc hover:bg-carmin/90" : "bg-lapis text-blanc hover:bg-lapis/90")}
                      onClick={() => action.confirm!.onConfirm(row)}
                    >
                      {action.confirm.confirmLabel ?? "Confirmer"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <DropdownMenuItem
                key={i}
                className={cn("gap-2 text-sm", action.tone === "danger" && "text-carmin focus:text-carmin")}
                onClick={() => action.onClick?.(row)}
              >
                <action.icon className="h-4 w-4" strokeWidth={1.5} /> {label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
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
  const [searchInput, setSearchInput] = React.useState("");

  // Debounce la recherche (300ms) — évite de filtrer à chaque frappe
  const debouncedSearch = useDebounce(searchInput, 300);

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

  // Appliquer la valeur debouncée au filtre de colonne (après déclaration de table)
  React.useEffect(() => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(debouncedSearch);
    }
  }, [debouncedSearch, searchKey, table]);

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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
