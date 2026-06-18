"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOSSIERS } from "@/lib/mock/dossiers";
import { UNIVERSITES } from "@/lib/mock/universites";
import { formationParId } from "@/lib/mock/formations";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Stamp, FileText, Download, Eye, Plus, CheckCircle2 } from "lucide-react";

const MODELES = [
  { id: "m1", nom: "Attestation standard", description: "Attestation de pré-inscription générique, sceau doré.", used: 4 },
  { id: "m2", nom: "Attestation bilingue FR/EN", description: "Pour universités anglophones (LAU, UCT).", used: 1 },
  { id: "m3", nom: "Certificat de transmission", description: "Document officiel de transmission du dossier à l'université.", used: 8 },
];

export default function AdminAttestationsPage() {
  const aEmettre = DOSSIERS.filter((d) => d.etat === "pre_admission");
  const emises = DOSSIERS.filter((d) => d.etat === "attestation" || d.etat === "cloture");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Attestations</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Modèles & émission.</h1>
        </div>
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Nouveau modèle", { description: "Concepteur de modèle ouvert (mock)." })}>
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Nouveau modèle
        </Button>
      </div>

      {/* Modèles */}
      <div>
        <p className="eyebrow mb-3">Modèles d'attestation</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODELES.map((m) => (
            <Card key={m.id} className="border-ligne bg-blanc p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-or-pale text-or">
                  <Stamp className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-ardoise">{m.used} usage(s)</Badge>
              </div>
              <h3 className="mt-3 font-display text-base font-bold text-encre">{m.nom}</h3>
              <p className="mt-1 text-sm text-ardoise">{m.description}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.success("Aperçu du modèle")}><Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu</Button>
                <Button variant="ghost" size="sm"><FileText className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* À émettre */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="border-b border-ligne px-6 py-4">
          <p className="eyebrow">File d'émission</p>
          <h2 className="font-display text-base font-bold text-encre">Attestations à émettre ({aEmettre.length})</h2>
        </div>
        {aEmettre.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-vert" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-ardoise">Aucune attestation en attente. Tout est à jour.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ligne">
            {aEmettre.map((d) => {
              const u = UNIVERSITES.find((x) => x.id === d.universiteId);
              const f = formationParId(d.formationId);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-ambre/10 font-mono text-[10px] font-semibold text-ambre">{d.candidatNom.slice(0, 2)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-encre">{d.candidatPrenom} {d.candidatNom}</p>
                    <p className="text-xs text-ardoise">{u?.nom} · {f?.intitule} · pré-admission le {formatDate(d.dateMaj)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.success("Aperçu généré")}><Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu</Button>
                    <Button size="sm" className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Attestation émise", { description: `${d.reference} — disponible dans l'espace candidat.` })}>
                      <Stamp className="mr-1.5 h-3.5 w-3.5" /> Émettre
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Émises */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="border-b border-ligne px-6 py-4">
          <p className="eyebrow">Historique</p>
          <h2 className="font-display text-base font-bold text-encre">Attestations émises ({emises.length})</h2>
        </div>
        <ul className="divide-y divide-ligne">
          {emises.map((d) => {
            const u = UNIVERSITES.find((x) => x.id === d.universiteId);
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-vert/10 text-vert"><CheckCircle2 className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-encre">{d.candidatPrenom} {d.candidatNom}</p>
                  <p className="font-mono text-xs text-ardoise">ATT-2026-0{d.reference.slice(-2)}-{u?.ecusson} · {u?.nom}</p>
                </div>
                <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">{d.etat === "cloture" ? "Récupérée" : "Disponible"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => toast.success("Téléchargement")}><Download className="h-3.5 w-3.5" /></Button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
