"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Stamp, FileText, Eye, Plus, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

type ModeleAttestation = {
  id: number;
  nom: string;
  description: string;
  nbUsages: number;
  actif: boolean;
  ordre: number;
};

type DossierApi = {
  id: string;
  reference: string;
  etat: string;
  updatedAt: string;
  candidat: { prenom: string; nom: string };
  universite: { nom: string; ecusson: string };
  formation: { intitule: string };
};

export default function AdminAttestationsPage() {
  const [dossiers, setDossiers] = React.useState<DossierApi[] | null>(null);
  const [modeles, setModeles] = React.useState<ModeleAttestation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/dossiers").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/public/modeles-attestation").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([d, m]: [DossierApi[] | null, ModeleAttestation[] | null]) => {
        if (!d) {
          setError("Impossible de charger les dossiers.");
          setLoading(false);
          return;
        }
        setDossiers(d);
        setModeles(Array.isArray(m) ? m : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur réseau lors du chargement.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !dossiers) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertTriangle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Erreur de chargement</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">{error ?? "Données indisponibles."}</AlertDescription>
      </Alert>
    );
  }

  const aEmettre = dossiers.filter((d) => d.etat?.toLowerCase() === "pre_admission");
  const emises = dossiers.filter((d) => {
    const e = d.etat?.toLowerCase();
    return e === "attestation" || e === "cloture";
  });

  const emettreAttestation = async (dossierId: string, reference: string) => {
    try {
      const res = await fetch(`/api/dossiers/${dossierId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "emettre_attestation" }),
      });
      if (!res.ok) {
        toast.error("Émission échouée", { description: "Le serveur a refusé l'action." });
        return;
      }
      toast.success("Attestation émise", { description: `${reference} — disponible dans l'espace candidat.` });
      // Refresh data
      fetch("/api/dossiers")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: DossierApi[] | null) => { if (d) setDossiers(d); })
        .catch(() => {});
    } catch {
      toast.error("Émission échouée", { description: "Erreur réseau." });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Attestations</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Modèles & émission.</h1>
        </div>
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Nouveau modèle", { description: "Concepteur de modèle ouvert." })}>
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Nouveau modèle
        </Button>
      </div>

      {/* Modèles */}
      <div>
        <p className="eyebrow mb-3">Modèles d'attestation</p>
        {modeles.length === 0 ? (
          <Card className="border-ligne bg-blanc p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-lapis" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-ardoise">Chargement des modèles…</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modeles.map((m) => (
              <Card key={m.id} className="border-ligne bg-blanc p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-or-pale text-or">
                    <Stamp className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] text-ardoise">{m.nbUsages} usage(s)</Badge>
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
        )}
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
            {aEmettre.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-ambre/10 font-mono text-[10px] font-semibold text-ambre">{(d.candidat?.nom ?? "").slice(0, 2)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-encre">{d.candidat?.prenom} {d.candidat?.nom}</p>
                  <p className="text-xs text-ardoise">{d.universite?.nom} · {d.formation?.intitule} · pré-admission le {formatDate(d.updatedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.success("Aperçu généré")}><Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu</Button>
                  <Button size="sm" className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => emettreAttestation(d.id, d.reference)}>
                    <Stamp className="mr-1.5 h-3.5 w-3.5" /> Émettre
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
          <h2 className="font-display text-base font-bold text-encre">Attestations émises ({emises.length})</h2>
        </div>
        {emises.length === 0 ? (
          <div className="p-10 text-center">
            <Stamp className="mx-auto h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-ardoise">Aucune attestation émise pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ligne">
            {emises.map((d) => {
              const ecusson = d.universite?.ecusson ?? "—";
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-vert/10 text-vert"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-encre">{d.candidat?.prenom} {d.candidat?.nom}</p>
                    <p className="font-mono text-xs text-ardoise">ATT-{d.reference.slice(-6)}-{ecusson} · {d.universite?.nom}</p>
                  </div>
                  <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">{d.etat?.toLowerCase() === "cloture" ? "Récupérée" : "Disponible"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => toast.success("Téléchargement")}><FileText className="h-3.5 w-3.5" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
