"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationLogementForm } from "@/components/espace/reservation-logement-form";
import { DemandeCrousForm } from "@/components/espace/demande-crous-form";

export default function LogementPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Logement</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Logement étudiant.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ardoise">
          Deux services distincts, à ne pas confondre l&apos;un pour l&apos;autre.
        </p>
      </div>

      <Tabs defaultValue="reservation">
        <TabsList>
          <TabsTrigger
            value="reservation"
            className="transition-colors hover:text-lapis data-[state=active]:bg-lapis data-[state=active]:text-blanc data-[state=active]:shadow-none data-[state=active]:hover:text-blanc"
          >
            Réservation de logement
          </TabsTrigger>
          <TabsTrigger
            value="crous"
            className="transition-colors hover:text-lapis data-[state=active]:bg-lapis data-[state=active]:text-blanc data-[state=active]:shadow-none data-[state=active]:hover:text-blanc"
          >
            Demande CROUS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservation" className="mt-4 space-y-4">
          <p className="max-w-2xl text-sm text-ardoise">
            Réservez un logement auprès de notre partenaire logement — la demande lui est
            transmise directement une fois vérifiée par notre équipe.
          </p>
          <ReservationLogementForm />
        </TabsContent>

        <TabsContent value="crous" className="mt-4 space-y-4">
          <p className="max-w-2xl text-sm text-ardoise">
            Faites votre demande de logement CROUS — elle est transmise à l&apos;administration,
            qui la traite et échange avec l&apos;organisme CROUS pour votre compte.
          </p>
          <DemandeCrousForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
