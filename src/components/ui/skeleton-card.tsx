"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton — placeholder animé pendant le chargement.
 * Respecte prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-ligne/60",
        "motion-reduce:animate-none",
        className
      )}
      aria-hidden
    />
  );
}

/** Skeleton d'une carte KPI (icône + valeur + label) */
export function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-ligne bg-blanc p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-7 w-20" />
      <Skeleton className="mt-1.5 h-3 w-32" />
    </div>
  );
}

/** Skeleton d'un chart (rectangle de la hauteur du graphique) */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-ligne bg-blanc p-5 shadow-sm", className)}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-48 w-full rounded-md" />
    </div>
  );
}

/** Skeleton d'une ligne de tableau */
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b border-ligne">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-3">
          <Skeleton className={cn("h-4", i === 0 ? "w-8" : i === 1 ? "w-32" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton d'un DataTable complet (header + 5 lignes) */
export function TableSkeleton({ columns = 6, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div>
      <div className="flex gap-2 pb-3">
        <Skeleton className="h-9 w-60 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="overflow-hidden rounded-lg border border-ligne bg-blanc">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ligne">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Skeleton du dashboard admin (5 KPIs + charts) */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton className="lg:col-span-2" />
        <ChartSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <div className="rounded-lg border border-ligne bg-blanc p-5 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton page formulaire (profil, auth) */
export function FormPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="rounded-lg border border-ligne bg-blanc p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton page messages */
export function MessagesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border border-ligne bg-blanc p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-ligne bg-blanc p-5 space-y-4 min-h-[320px]">
          <Skeleton className="h-4 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-12 rounded-lg", i % 2 === 0 ? "w-3/4 ml-auto" : "w-2/3")} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton du dashboard candidat */
export function EspaceDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-ligne bg-blanc shadow-sm">
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-8 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-32 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
          <Skeleton className="min-h-[200px]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-ligne bg-blanc p-5 shadow-sm space-y-3">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-ligne bg-blanc p-4 shadow-sm space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
