import { EspaceDashboardSkeleton } from "@/components/ui/skeleton-card";

export default function EspaceLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Chargement de l'espace candidat">
      <EspaceDashboardSkeleton />
    </div>
  );
}
