import { AdminDashboardSkeleton, TableSkeleton } from "@/components/ui/skeleton-card";

export default function AdminLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Chargement du back-office">
      <AdminDashboardSkeleton />
      <TableSkeleton columns={6} rows={4} />
    </div>
  );
}
