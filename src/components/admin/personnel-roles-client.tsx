"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap } from "lucide-react";
import { UtilisateursClient, type UserRow } from "@/components/admin/utilisateurs-client";
import { CandidatsClient, type CandidatRow } from "@/components/admin/candidats-client";

export function PersonnelRolesClient({
  staff,
  candidats,
  currentRole,
  currentUserId,
  canWriteCandidats,
}: {
  staff: UserRow[];
  candidats: CandidatRow[];
  currentRole: "ADMIN" | "SUPER_ADMIN";
  currentUserId: string;
  canWriteCandidats: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Personnel &amp; rôles.
        </h1>
      </div>

      <Tabs defaultValue="personnel">
        <TabsList className="bg-porcelaine">
          <TabsTrigger value="personnel">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Personnel
          </TabsTrigger>
          <TabsTrigger value="candidats">
            <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Candidats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="mt-4">
          <UtilisateursClient initialData={staff} currentRole={currentRole} currentUserId={currentUserId} hideTitle />
        </TabsContent>

        <TabsContent value="candidats" className="mt-4">
          <CandidatsClient initialData={candidats} canWrite={canWriteCandidats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
