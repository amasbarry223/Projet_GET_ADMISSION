"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogementClient, type LogementRow } from "@/components/admin/logement-client";

export function LogementTabsClient({
  defaultTab,
  reservationData,
  crousData,
}: {
  defaultTab: "reservation" | "crous";
  reservationData: LogementRow[];
  crousData: LogementRow[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Demandes de logement.
        </h1>
        <p className="text-sm text-ardoise">
          Réservation de logement classique et demande CROUS — deux services distincts.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="reservation">Réservation de logement</TabsTrigger>
          <TabsTrigger value="crous">Demande CROUS</TabsTrigger>
        </TabsList>
        <TabsContent value="reservation" className="mt-4">
          <LogementClient
            initialData={reservationData}
            basePath="/admin/logement"
            apiBasePath="/api/admin/logement"
            title="Réservations de logement."
            emptyLabel="Aucune réservation de logement pour l'instant."
          />
        </TabsContent>
        <TabsContent value="crous" className="mt-4">
          <LogementClient
            initialData={crousData}
            basePath="/admin/logement/crous"
            apiBasePath="/api/admin/logement/crous"
            title="Demandes de logement CROUS."
            emptyLabel="Aucune demande de logement CROUS pour l'instant."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
