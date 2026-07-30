export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lapis border-t-transparent" />
        <p className="font-mono text-xs uppercase tracking-eyebrow text-ardoise">Chargement…</p>
      </div>
    </div>
  );
}
