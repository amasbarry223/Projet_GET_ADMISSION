"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap } from "lucide-react";
import { UtilisateursClient, type UserRow } from "@/components/admin/utilisateurs-client";
import { CandidatsClient, type CandidatRow } from "@/components/admin/candidats-client";

const tabTriggerClass =
  "transition-colors hover:text-lapis data-[state=active]:bg-lapis data-[state=active]:text-blanc data-[state=active]:shadow-none data-[state=active]:hover:text-blanc";

export function PersonnelRolesClient({
  staff,
  candidats,
  currentRole,
  currentUserId,
  canWriteCandidats,
  defaultTab = "personnel",
}: {
  staff: UserRow[];
  candidats: CandidatRow[];
  currentRole: "ADMIN" | "SUPER_ADMIN";
  currentUserId: string;
  canWriteCandidats: boolean;
  defaultTab?: "personnel" | "candidats";
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Personnel &amp; rôles.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ardoise">
          Comptes internes et candidats inscrits — deux espaces de gestion distincts.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="personnel" className={tabTriggerClass}>
            <Users className="mr-1.5 h-3.5 w-3.5" /> Personnel
          </TabsTrigger>
          <TabsTrigger value="candidats" className={tabTriggerClass}>
            <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Candidats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="mt-4 space-y-4">
          <p className="max-w-2xl text-sm text-ardoise">
            Conseillers, financiers et administrateurs — rôles, accès et activité des membres de l&apos;équipe.
          </p>
          <UtilisateursClient initialData={staff} currentRole={currentRole} currentUserId={currentUserId} hideTitle />
        </TabsContent>

        <TabsContent value="candidats" className="mt-4 space-y-4">
          <p className="max-w-2xl text-sm text-ardoise">
            Comptes candidats — inscription, vérification KYC, dossiers et exports.
          </p>
          <CandidatsClient initialData={candidats} canWrite={canWriteCandidats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
