"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogementClient, type LogementRow } from "@/components/admin/logement-client";

const tabTriggerClass =
  "transition-colors hover:text-lapis data-[state=active]:bg-lapis data-[state=active]:text-blanc data-[state=active]:shadow-none data-[state=active]:hover:text-blanc";

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
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Logement</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Demandes de logement.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ardoise">
          Réservation de logement classique et demande CROUS — deux services distincts.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="reservation" className={tabTriggerClass}>
            Réservation de logement
          </TabsTrigger>
          <TabsTrigger value="crous" className={tabTriggerClass}>
            Demande CROUS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservation" className="mt-4 space-y-4">
          <p className="max-w-2xl text-sm text-ardoise">
            Réservations transmises au partenaire logement après vérification par l&apos;équipe.
          </p>
          <LogementClient
            initialData={reservationData}
            basePath="/admin/logement"
            apiBasePath="/api/admin/logement"
            title="Réservations de logement."
            emptyLabel="Aucune réservation de logement pour l'instant."
          />
        </TabsContent>

        <TabsContent value="crous" className="mt-4 space-y-4">
          <p className="max-w-2xl text-sm text-ardoise">
            Demandes CROUS traitées par l&apos;administration et transmises à l&apos;organisme.
          </p>
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
