"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Stamp, Lock, Download, Eye, EyeOff, MapPin, ShieldCheck, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";

type Dossier = {
  id: string;
  reference: string;
  etat: string;
  mrz: string;
  candidat: { prenom: string; nom: string };
  universite: { nom: string; ville: string; pays: string };
  formation: { intitule: string };
  historiques: { id: string; date: string; etat: string; auteur: string; note: string }[];
};

export default function AttestationPage() {
  const [dossier, setDossier] = React.useState<Dossier | null>(null);
  const [directrice, setDirectrice] = React.useState<{ nom: string; role: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [remiseAgence, setRemiseAgence] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/dossiers").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/public/equipe").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([data, equipe]) => {
        setDossier(data[0] ?? null);
        const dir = equipe.find((m: { role: string }) => m.role.toLowerCase().includes("directrice") || m.role.toLowerCase().includes("directeur"));
        setDirectrice(dir ?? { nom: "GET Admission", role: "Direction" });
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger votre dossier.");
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

  if (error || !dossier) {
    return (
      <Alert className="border-ambre/40 bg-ambre/5">
        <AlertCircle className="h-4 w-4 text-ambre" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Aucun dossier</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Vous n'avez pas encore de dossier.{" "}
          <Link href="/espace/dossier" className="font-medium text-lapis-clair hover:underline">
            Créer mon dossier
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const d = dossier;
  // Attestation disponible uniquement si l'état est ATTESTATION ou CLOTURE.
  const etatUpper = d.etat.toUpperCase();
  const isAvailable = etatUpper === "ATTESTATION" || etatUpper === "CLOTURE";
  const referenceAtt = `ATT-${d.reference.slice(-4)}`;
  const codeVerification = `VRF-${d.id.slice(0, 4).toUpperCase()}-${d.reference.slice(-4)}`;

  // Date de pré-admission : chercher dans l'historique une entrée PRE_ADMISSION
  const preAdmissionEntry = d.historiques.find((h) => h.etat.toUpperCase() === "PRE_ADMISSION");
  const preAdmissionDate = preAdmissionEntry?.date;
  // Date d'émission : la plus récente entrée ATTESTATION, sinon aujourd'hui
  const attestationEntry = d.historiques.find((h) => h.etat.toUpperCase() === "ATTESTATION");
  const emissionDate = attestationEntry?.date ?? new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Attestation de pré-inscription</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Votre attestation officielle.</h1>
      </div>

      {isAvailable ? (
        <Alert className="border-vert/30 bg-vert/5 p-6">
          <CheckCircle2 className="h-5 w-5 text-vert" strokeWidth={1.5} />
          <AlertTitle className="font-display text-xl font-bold text-encre">Attestation disponible.</AlertTitle>
          <AlertDescription className="mt-1 text-sm text-ardoise">
            Votre attestation est prête. Téléchargez-la ou récupérez-la à l'agence.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-ligne bg-blanc p-6">
          <Clock className="h-5 w-5 text-ambre" strokeWidth={1.5} />
          <AlertTitle className="font-display text-xl font-bold text-encre">Attestation en cours d'émission.</AlertTitle>
          <AlertDescription className="mt-1 text-sm text-ardoise">
            Votre attestation sera disponible après la décision de l'université partenaire.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-ligne bg-blanc p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ardoise/10">
          <Lock className="h-7 w-7 text-ardoise" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-xl font-bold text-encre">
          {isAvailable ? "Attestation prête à être récupérée." : "Attestation en cours d'émission."}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ardoise">
          {isAvailable
            ? "Téléchargez votre attestation officielle ci-dessous ou activez le retrait à l'agence."
            : "Votre attestation sera disponible après la décision de l'université partenaire."}
        </p>

        <div className="mx-auto mt-5 max-w-sm rounded-md border border-vert/30 bg-vert/5 p-4 text-left">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.5} />
            <p className="text-sm font-medium text-encre">
              {preAdmissionDate
                ? `Pré-admission accordée le ${formatDate(preAdmissionDate)}`
                : "Pré-admission en cours"}
            </p>
          </div>
          <p className="mt-1 text-xs text-ardoise">
            {isAvailable
              ? "Attestation émise et disponible. Votre conseiller vous notifiera dès qu'elle sera prête."
              : "Attestation disponible sous 48h ouvrées. Votre conseiller vous notifiera dès qu'elle sera prête."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview((s) => !s)}>
            {showPreview ? <><EyeOff className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Masquer l'aperçu</> : <><Eye className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Aperçu de l'attestation</>}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card className="border-ligne bg-blanc p-0 overflow-hidden">
          <div className="border-b border-ligne bg-porcelaine px-6 py-3">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Aperçu — non officiel</p>
          </div>

          {/* Attestation document */}
          <div className="relative mx-auto max-w-2xl p-8 sm:p-12">
            <div className="rule-or mb-6" aria-hidden />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-eyebrow text-lapis">GET Admission</p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Attestation<br />de pré-inscription</h2>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</p>
                <p className="font-mono text-sm font-semibold text-encre">{referenceAtt}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Année</p>
                <p className="font-mono text-sm text-encre">2026-2027</p>
              </div>
            </div>

            <div className="my-6 h-px bg-ligne" aria-hidden />

            {/* Body */}
            <div className="space-y-4 text-encre">
              <p className="text-sm leading-relaxed">
                Je soussignée <span className="font-semibold">{directrice?.nom ?? "GET Admission"}</span>, {directrice?.role ?? "Direction"} de GET Admission, atteste que
              </p>
              <p className="font-display text-xl font-bold text-lapis">
                {d.candidat.prenom} {d.candidat.nom}
              </p>
              <p className="text-sm leading-relaxed">
                a constitué un dossier complet et conforme, et a été admis(e) en pré-inscription pour le cursus
              </p>
              <p className="font-display text-lg font-bold text-encre">
                {d.formation.intitule}
              </p>
              <p className="text-sm leading-relaxed">
                à l'<span className="font-semibold">{d.universite.nom}</span> ({d.universite.ville}, {d.universite.pays}), pour l'année universitaire 2026-2027.
              </p>

              <div className="rounded-md border border-ligne bg-porcelaine p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Code vérification</p>
                    <p className="font-mono text-sm font-semibold text-encre">{codeVerification}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Date d'émission</p>
                    <p className="font-mono text-sm text-encre">{formatDate(emissionDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Golden seal */}
            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Signature</p>
                <p className="mt-6 font-display text-base font-bold text-encre">{directrice?.nom ?? "GET Admission"}</p>
                <p className="text-xs text-ardoise">Directrice · GET Admission</p>
              </div>

              <div className="relative">
                <div
                  className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-[3px] border-or bg-or-pale/60 shadow-stamp"
                  style={{ transform: "rotate(-8deg)" }}
                  aria-label="Sceau officiel GET Admission"
                >
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-or">
                    <Stamp className="h-5 w-5 text-or" strokeWidth={1.5} />
                    <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-eyebrow text-or">GET Admission</p>
                    <p className="font-mono text-[7px] uppercase tracking-eyebrow text-or/80">Sceau officiel</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-6 rule-or" aria-hidden />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ardoise">
              <span className="font-mono">GETADM · {d.reference} · {d.mrz.split("\n")[1]}</span>
              <span className="font-mono">Document généré électroniquement — authentifiez-le via getadm.com/verifier</span>
            </div>
          </div>

          <div className="border-t border-ligne bg-porcelaine px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button onClick={() => toast.success("Téléchargement", { description: `${referenceAtt.toLowerCase()}.pdf` })}>
                  <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Télécharger le PDF
                </Button>
                <div className="flex items-center gap-2 rounded-md border border-ligne bg-blanc px-3 py-1.5">
                  <Switch id="remise" checked={remiseAgence} onCheckedChange={(v) => { setRemiseAgence(v); toast.success(v ? "Mode de remise enregistré" : "Mode de remise réinitialisé", { description: v ? "Retrait à l'agence — Dakar." : undefined }); }} />
                  <Label htmlFor="remise" className="flex items-center gap-1.5 text-sm text-encre cursor-pointer">
                    <MapPin className="h-3.5 w-3.5 text-lapis" strokeWidth={1.5} /> Je viendrai la récupérer à l'agence
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ardoise">
                <ShieldCheck className="h-3.5 w-3.5 text-vert" strokeWidth={1.5} />
                <span>Sceau vérifiable en ligne</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
