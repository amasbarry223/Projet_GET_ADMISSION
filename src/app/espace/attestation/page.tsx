"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import { getApiErrorMessageSync } from "@/lib/api-error";
import { usePrimaryDossier } from "@/hooks/use-primary-dossier";
import { pickPrimaryDossier } from "@/lib/dossier/pick-dossier";
import { runAsyncEffect } from "@/lib/run-async-effect";
import {
  Stamp,
  Download,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  ArrowRight,
} from "lucide-react";

type Dossier = {
  id: string;
  reference: string;
  etat: string;
  updatedAt: string;
  mrz: string;
  candidat: { prenom: string; nom: string };
  universite: { nom: string; ville: string; pays: string };
  formation: { intitule: string };
  historiques: { id: string; date: string; etat: string; auteur: string; note: string }[];
};

type Attestation = {
  id: string;
  reference: string;
  codeVerification: string;
  dateEmission: string;
  modeRemise: string;
  emetteur: { prenom: string; nom: string; role: string };
};

export default function AttestationPage() {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <AttestationInner />
    </Suspense>
  );
}

function AttestationInner() {
  const searchParams = useSearchParams();
  const preferredId = searchParams.get("dossierId");
  const {
    dossier: primaryDossier,
    loading: dossierLoading,
    error: dossierError,
    refetch: refetchDossier,
  } = usePrimaryDossier(preferredId);
  const dossier = primaryDossier
    ? {
        id: primaryDossier.id,
        reference: primaryDossier.reference ?? "",
        etat: primaryDossier.etat,
        updatedAt: primaryDossier.updatedAt,
        mrz: primaryDossier.mrz ?? "",
        candidat: primaryDossier.candidat ?? { prenom: "", nom: "" },
        universite: {
          nom: primaryDossier.universite?.nom ?? "",
          ville: primaryDossier.universite?.ville ?? "",
          pays: primaryDossier.universite?.pays ?? "",
        },
        formation: { intitule: primaryDossier.formation?.intitule ?? "" },
        historiques: primaryDossier.historiques ?? [],
      }
    : null;
  const [attestation, setAttestation] = React.useState<Attestation | null>(null);
  const [directrice, setDirectrice] = React.useState<{ nom: string; role: string } | null>(null);
  const [attestationLoading, setAttestationLoading] = React.useState(false);
  const [attestationError, setAttestationError] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [remiseAgence, setRemiseAgence] = React.useState(false);
  const [savingRemise, setSavingRemise] = React.useState(false);

  const loadAttestation = React.useCallback(async (dossierId: string) => {
    setAttestationLoading(true);
    setAttestationError(null);
    try {
      const [attRes, equipeRes] = await Promise.all([
        fetch(`/api/attestations/${dossierId}`),
        fetch("/api/public/equipe"),
      ]);
      const equipe = equipeRes.ok ? await equipeRes.json() : [];
      const dir = (equipe as { role: string; nom?: string }[]).find(
        (m) =>
          m.role.toLowerCase().includes("directrice") ||
          m.role.toLowerCase().includes("directeur"),
      );
      setDirectrice(
        dir
          ? { nom: dir.nom ?? "GET Admission", role: dir.role }
          : { nom: "GET Admission", role: "Direction" },
      );

      if (attRes.ok) {
        const att = (await attRes.json()) as Attestation;
        setAttestation(att);
        setRemiseAgence(att.modeRemise === "agence");
        setAttestationError(null);
      } else if (attRes.status === 404) {
        setAttestation(null);
        setAttestationError(null);
      } else {
        const body = await attRes.json().catch(() => ({}));
        setAttestation(null);
        setAttestationError(
          getApiErrorMessageSync(
            attRes.status,
            body,
            "Impossible de vérifier l'attestation. Réessayez.",
          ),
        );
      }
    } catch (e) {
      setAttestation(null);
      setAttestationError(
        getApiErrorMessageSync(e, undefined, "Impossible de vérifier l'attestation. Réessayez."),
      );
    } finally {
      setAttestationLoading(false);
    }
  }, []);

  const loadPage = React.useCallback(() => {
    void refetchDossier().then((result) => {
      const picked = pickPrimaryDossier(result.data ?? [], preferredId);
      if (picked?.id) void loadAttestation(picked.id);
    });
  }, [refetchDossier, preferredId, loadAttestation]);

  React.useEffect(() => {
    if (!dossier?.id) return;
    return runAsyncEffect(() => {
      void loadAttestation(dossier.id);
    });
  }, [dossier?.id, loadAttestation]);

  const displayAttestation = dossier?.id ? attestation : null;
  const loading = dossierLoading || (!!dossier?.id && attestationLoading && !displayAttestation && !attestationError);
  const error = dossierError;

  async function persistModeRemise(agence: boolean) {
    if (!dossier?.id || !displayAttestation) {
      toast.error("Attestation non encore émise", {
        description: "Elle apparaîtra ici dès l'émission par l'agence.",
      });
      return;
    }
    setRemiseAgence(agence);
    setSavingRemise(true);
    try {
      const modeRemise = agence ? "agence" : "telechargement";
      const res = await fetch(`/api/attestations/${dossier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modeRemise }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessageSync(res.status, err, "Impossible d'enregistrer le mode de remise"),
        );
      }
      const updated = (await res.json()) as Attestation;
      setAttestation((prev) => (prev ? { ...prev, modeRemise: updated.modeRemise } : prev));
      toast.success(agence ? "Retrait à l'agence enregistré" : "Téléchargement sélectionné", {
        description: agence ? "Présentez-vous à l'agence — Dakar." : undefined,
      });
    } catch (e) {
      setRemiseAgence(!agence);
      toast.error("Mode de remise", {
        description: getApiErrorMessageSync(e, undefined, "Impossible d'enregistrer le mode de remise"),
      });
    } finally {
      setSavingRemise(false);
    }
  }

  if (loading) {
    return <FormPageSkeleton />;
  }

  if (error) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Chargement impossible</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          {error}{" "}
          <button type="button" className="font-medium text-lapis underline" onClick={loadPage}>
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dossier) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-5 w-5" strokeWidth={1.5} />}
        title="Aucun dossier"
        description="Vous n'avez pas encore de dossier. Composez-le pour suivre votre attestation."
        action={
          <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href="/espace/dossier">Composer mon dossier</Link>
          </Button>
        }
      />
    );
  }

  const d = dossier;
  const etatUpper = d.etat.toUpperCase();
  const isIssued = !!displayAttestation;
  const phaseAttestation = etatUpper === "ATTESTATION" || etatUpper === "CLOTURE";
  const historiques = d.historiques ?? [];
  const preAdmissionEntry = historiques.find((h) => h.etat.toUpperCase() === "PRE_ADMISSION");
  const preAdmissionDate = preAdmissionEntry?.date;
  const emissionDate = displayAttestation?.dateEmission;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Attestation de pré-inscription</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Votre attestation officielle.
        </h1>
      </div>

      {attestationError ? (
        <Alert className="border-carmin/40 bg-carmin/5 p-6">
          <AlertCircle className="h-5 w-5 text-carmin" strokeWidth={1.5} />
          <AlertTitle className="font-display text-xl font-bold text-encre">Vérification impossible.</AlertTitle>
          <AlertDescription className="mt-1 text-sm text-ardoise">
            {attestationError}{" "}
            <button type="button" className="font-medium text-lapis underline" onClick={loadPage}>
              Réessayer
            </button>
          </AlertDescription>
        </Alert>
      ) : isIssued ? (
        <Alert className="border-vert/30 bg-vert/5 p-6">
          <CheckCircle2 className="h-5 w-5 text-vert" strokeWidth={1.5} />
          <AlertTitle className="font-display text-xl font-bold text-encre">Attestation disponible.</AlertTitle>
          <AlertDescription className="mt-1 text-sm text-ardoise">
            Votre attestation est émise. Téléchargez-la ou récupérez-la à l&apos;agence.
          </AlertDescription>
        </Alert>
      ) : phaseAttestation ? (
        <Alert className="border-ambre/40 bg-ambre/5 p-6">
          <Clock className="h-5 w-5 text-ambre" strokeWidth={1.5} />
          <AlertTitle className="font-display text-xl font-bold text-encre">Émission en cours.</AlertTitle>
          <AlertDescription className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-ardoise">
            <span>
              Votre dossier est en phase attestation. Le document officiel apparaîtra ici dès émission par
              l&apos;agence.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/espace/messages">Contacter mon conseiller</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <EmptyState
          icon={<Clock className="h-5 w-5" strokeWidth={1.5} />}
          title="Attestation pas encore disponible"
          description={
            etatUpper === "PRE_ADMISSION"
              ? "Votre pré-admission est accordée. L'attestation sera émise prochainement."
              : "Elle sera accessible ici dès que l'université aura validé votre pré-admission."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
                <Link href="/espace">
                  Tableau de bord <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/espace/messages">Écrire au conseiller</Link>
              </Button>
            </div>
          }
        />
      )}

      {isIssued && !attestationError && (
        <Card className="border-ligne bg-blanc p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-vert/10">
            <Stamp className="h-7 w-7 text-vert" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-xl font-bold text-encre">Attestation prête à être récupérée.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ardoise">
            Téléchargez votre attestation officielle ci-dessous ou activez le retrait à l&apos;agence.
          </p>

          <div className="mx-auto mt-5 max-w-sm rounded-md border border-vert/30 bg-vert/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.5} />
              <p className="text-sm font-medium text-encre">
                {preAdmissionDate
                  ? `Pré-admission accordée le ${formatDate(preAdmissionDate)}`
                  : "Pré-admission confirmée"}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-vert/20 pt-3 text-left text-sm">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</p>
                <p className="font-mono font-semibold text-encre">{displayAttestation!.reference}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Code vérification</p>
                <p className="font-mono font-semibold text-encre">{displayAttestation!.codeVerification}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.open(`/api/attestation-pdf/${dossier.id}`, "_blank")}>
              <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Télécharger le PDF
            </Button>
            <Button variant="outline" onClick={() => setShowPreview((s) => !s)}>
              {showPreview ? (
                <>
                  <EyeOff className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Masquer l&apos;aperçu
                </>
              ) : (
                <>
                  <Eye className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Aperçu de l&apos;attestation
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {isIssued && showPreview && displayAttestation && (
        <Card className="overflow-hidden border-ligne bg-blanc p-0">
          <div className="border-b border-ligne bg-porcelaine px-6 py-3">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
              Aperçu à l&apos;écran — le PDF officiel fait foi
            </p>
          </div>

          <div className="relative mx-auto max-w-2xl p-8 sm:p-12">
            <div
              className="pointer-events-none absolute inset-8 flex items-center justify-center sm:inset-12"
              aria-hidden
            >
              <p className="rotate-[-18deg] select-none font-display text-4xl font-bold uppercase tracking-widest text-encre/8 sm:text-5xl">
                Aperçu
              </p>
            </div>

            <div className="rule-or mb-6" aria-hidden />

            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-eyebrow text-lapis">GET Admission</p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
                  Attestation
                  <br />
                  de pré-inscription
                </h2>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</p>
                <p className="font-mono text-sm font-semibold text-encre">{displayAttestation.reference}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Année</p>
                <p className="font-mono text-sm text-encre">2026-2027</p>
              </div>
            </div>

            <div className="my-6 h-px bg-ligne" aria-hidden />

            <div className="space-y-4 text-encre">
              <p className="text-sm leading-relaxed">
                Je soussignée <span className="font-semibold">{directrice?.nom ?? "GET Admission"}</span>,{" "}
                {directrice?.role ?? "Direction"} de GET Admission, atteste que
              </p>
              <p className="font-display text-xl font-bold text-lapis">
                {d.candidat.prenom} {d.candidat.nom}
              </p>
              <p className="text-sm leading-relaxed">
                a constitué un dossier complet et conforme, et a été admis(e) en pré-inscription pour le cursus
              </p>
              <p className="font-display text-lg font-bold text-encre">{d.formation.intitule}</p>
              <p className="text-sm leading-relaxed">
                à l&apos;<span className="font-semibold">{d.universite.nom}</span> ({d.universite.ville},{" "}
                {d.universite.pays}), pour l&apos;année universitaire 2026-2027.
              </p>

              <div className="rounded-md border border-ligne bg-porcelaine p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                      Code vérification
                    </p>
                    <p className="font-mono text-sm font-semibold text-encre">
                      {displayAttestation.codeVerification}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                      Date d&apos;émission
                    </p>
                    <p className="font-mono text-sm text-encre">
                      {emissionDate ? formatDate(emissionDate) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Signature</p>
                <p className="mt-6 font-display text-base font-bold text-encre">
                  {directrice?.nom ?? "GET Admission"}
                </p>
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
                    <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-eyebrow text-or">
                      GET Admission
                    </p>
                    <p className="font-mono text-[7px] uppercase tracking-eyebrow text-or/80">Sceau officiel</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-6 rule-or" aria-hidden />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ardoise">
              <span className="font-mono">
                GETADM · {d.reference} · {(d.mrz ?? "").split("\n")[1] ?? d.reference}
              </span>
              <span className="font-mono">
                Document généré électroniquement — authentifiez-le via getadm.com/verifier
              </span>
            </div>
          </div>

          <div className="border-t border-ligne bg-porcelaine px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button onClick={() => window.open(`/api/attestation-pdf/${dossier.id}`, "_blank")}>
                  <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Télécharger le PDF
                </Button>
                <div className="flex items-center gap-2 rounded-md border border-ligne bg-blanc px-3 py-1.5">
                  <Switch
                    id="remise"
                    checked={remiseAgence}
                    disabled={savingRemise}
                    onCheckedChange={(v) => void persistModeRemise(v)}
                  />
                  <Label
                    htmlFor="remise"
                    className="flex cursor-pointer items-center gap-1.5 text-sm text-encre"
                  >
                    <MapPin className="h-3.5 w-3.5 text-lapis" strokeWidth={1.5} /> Je viendrai la récupérer à
                    l&apos;agence
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
