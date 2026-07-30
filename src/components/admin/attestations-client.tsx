"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Stamp, FileText, Eye, Plus, CheckCircle2, Loader2 } from "lucide-react";

export type AttestationDossier = {
  id: string;
  reference: string;
  etat: string;
  updatedAt: string;
  candidatPrenom: string;
  candidatNom: string;
  universiteNom: string;
  universiteEcusson: string;
  formationIntitule: string;
};

export type ModeleAttestation = {
  id: number;
  nom: string;
  description: string;
  nbUsages: number;
  actif: boolean;
  ordre: number;
};

export function AttestationsClient({
  initialAEmettre,
  initialEmises,
  initialModeles,
}: {
  initialAEmettre: AttestationDossier[];
  initialEmises: AttestationDossier[];
  initialModeles: ModeleAttestation[];
}) {
  const [aEmettre, setAEmettre] = React.useState<AttestationDossier[]>(initialAEmettre);
  const [emises, setEmises] = React.useState<AttestationDossier[]>(initialEmises);
  const [modeles] = React.useState<ModeleAttestation[]>(initialModeles);
  const router = useRouter();
  // ID du dossier en cours d'émission (pour le bouton Loader2).
  const [emittingId, setEmittingId] = React.useState<string | null>(null);

  // Synchronise l'état local avec les props serveur lorsque `router.refresh()`
  // rapatrie des données fraîches (écrase l'optimistic UI par la source de vérité).
  React.useEffect(() => {
    setAEmettre(initialAEmettre);
  }, [initialAEmettre]);
  React.useEffect(() => {
    setEmises(initialEmises);
  }, [initialEmises]);

  const emettreAttestation = async (dossierId: string, reference: string) => {
    setEmittingId(dossierId);
    try {
      const res = await fetch(`/api/dossiers/${dossierId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "emettre_attestation" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Émission échouée", { description: (err as any)?.error ?? "Le serveur a refusé l'action." });
        return;
      }
      toast.success("Attestation émise", {
        description: `${reference} — disponible dans l'espace candidat.`,
      });
      // Move dossier from "à émettre" to "émises" locally (optimistic UI update).
      setAEmettre((prev) => prev.filter((d) => d.id !== dossierId));
      setEmises((prev) => {
        const moved = aEmettre.find((d) => d.id === dossierId);
        if (!moved) return prev;
        return [
          { ...moved, etat: "ATTESTATION" },
          ...prev,
        ];
      });
      // Re-fetch server data to sync with the database (new attestation record, updated état).
      router.refresh();
    } catch {
      toast.error("Émission échouée", { description: "Erreur réseau." });
    } finally {
      setEmittingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Attestations</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Modèles &amp; émission.
          </h1>
        </div>
        <Button
          className="bg-lapis text-blanc hover:bg-lapis/90"
          onClick={async () => {
            const nom = window.prompt("Nom du modèle :");
            if (!nom) return;
            const description = window.prompt("Description :") ?? "";
            try {
              const res = await fetch("/api/public/modeles-attestation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nom, description }),
              });
              if (res.ok) {
                toast.success("Modèle créé", { description: nom });
                router.refresh();
              } else {
                toast.error("Échec", { description: "La création a échoué." });
              }
            } catch {
              toast.error("Erreur réseau");
            }
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Nouveau modèle
        </Button>
      </div>

      {/* Modèles */}
      <div>
        <p className="eyebrow mb-3">Modèles d&apos;attestation</p>
        {modeles.length === 0 ? (
          <Card className="border-ligne bg-blanc p-8 text-center">
            <Stamp className="mx-auto h-6 w-6 text-ardoise/40" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-ardoise">Aucun modèle actif pour le moment.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modeles.map((m) => (
              <Card key={m.id} className="border-ligne bg-blanc p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-or-pale text-or">
                    <Stamp className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] text-ardoise">
                    {m.nbUsages} usage(s)
                  </Badge>
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-encre">{m.nom}</h3>
                <p className="mt-1 text-sm text-ardoise">{m.description}</p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(`/api/attestation-pdf/${emettreDossier?.id ?? modele.id}`, "_blank")}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/public/modeles-attestation`, "_blank")}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* À émettre */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="border-b border-ligne px-6 py-4">
          <p className="eyebrow">File d&apos;émission</p>
          <h2 className="font-display text-base font-bold text-encre">
            Attestations à émettre ({aEmettre.length})
          </h2>
        </div>
        {aEmettre.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-vert" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-ardoise">Aucune attestation en attente. Tout est à jour.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ligne">
            {aEmettre.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-ambre/10 font-mono text-[10px] font-semibold text-ambre">
                  {(d.candidatNom ?? "").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-encre">
                    {d.candidatPrenom} {d.candidatNom}
                  </p>
                  <p className="text-xs text-ardoise">
                    {d.universiteNom} · {d.formationIntitule} · pré-admission le {formatDate(d.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.success("Aperçu généré")}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu
                  </Button>
                  <Button
                    size="sm"
                    className="bg-lapis text-blanc hover:bg-lapis/90"
                    onClick={() => emettreAttestation(d.id, d.reference)}
                    disabled={emittingId === d.id}
                  >
                    {emittingId === d.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Stamp className="mr-1.5 h-3.5 w-3.5" />
                    )}{" "}
                    Émettre
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Émises */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="border-b border-ligne px-6 py-4">
          <p className="eyebrow">Historique</p>
          <h2 className="font-display text-base font-bold text-encre">
            Attestations émises ({emises.length})
          </h2>
        </div>
        {emises.length === 0 ? (
          <div className="p-10 text-center">
            <Stamp className="mx-auto h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-ardoise">Aucune attestation émise pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ligne">
            {emises.map((d) => {
              const ecusson = d.universiteEcusson ?? "—";
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-vert/10 text-vert">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-encre">
                      {d.candidatPrenom} {d.candidatNom}
                    </p>
                    <p className="font-mono text-xs text-ardoise">
                      ATT-{d.reference.slice(-6)}-{ecusson} · {d.universiteNom}
                    </p>
                  </div>
                  <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">
                    {d.etat?.toLowerCase() === "cloture" ? "Récupérée" : "Disponible"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/attestation-pdf/${d.id}`, "_blank")}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
