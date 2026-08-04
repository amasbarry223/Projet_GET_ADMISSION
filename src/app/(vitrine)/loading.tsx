import { Skeleton } from "@/components/ui/skeleton";

export default function VitrineLoading() {
  return (
    <div className="min-h-[50vh] bg-porcelaine">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Skeleton className="mb-4 h-3 w-28" />
        <Skeleton className="mb-3 h-10 w-full max-w-xl" />
        <Skeleton className="mb-10 h-5 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <p className="mt-8 font-mono text-xs uppercase tracking-eyebrow text-ardoise">Chargement…</p>
      </div>
    </div>
  );
}
