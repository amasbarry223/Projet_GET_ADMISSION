"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/site/motion-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { profilFromApi } from "@/components/dossier/profil-academique-form";
import {
  parseStringList,
  WIZARD_STEP_LABELS,
  type DossierWizardData,
} from "@/components/dossier/wizard/types";
import {
  useDossierWizardState,
  useLoadExistingDossier,
} from "@/components/dossier/wizard/use-dossier-wizard-state";
import { useAutosaveDossierDraft } from "@/components/dossier/wizard/use-autosave-dossier-draft";
import {
  refreshPiecesFromDossier,
  useUploadDossierPiece,
} from "@/components/dossier/wizard/use-upload-dossier-piece";
import { DossierStepUniversite } from "@/components/dossier/wizard/step-universite";
import { DossierStepInfos } from "@/components/dossier/wizard/step-infos";
import { DossierStepProfilAcademique } from "@/components/dossier/wizard/step-profil-academique";
import { DossierStepDocuments } from "@/components/dossier/wizard/step-documents";
import { DossierStepIdentite } from "@/components/dossier/wizard/step-identite";
import { DossierStepRecap } from "@/components/dossier/wizard/step-recap";
import { resolveFraisAgence } from "@/lib/dossier/frais-agence";
import { listPiecesManquantes } from "@/lib/dossier/pieces-requises";
import { etatParCode } from "@/lib/etats";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Lock,
  Plane,
  Loader2,
} from "lucide-react";
import {
  API_ERROR_CODES,
  API_ROUTES,
  DOSSIER_WIZARD_STEP_COUNT,
  DOSSIER_WIZARD_STEPS,
  isDossierEditableByCandidate,
} from "@/shared/constants";

export default function DossierPage() {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <DossierWizard />
    </Suspense>
  );
}

function DossierWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefUniv = searchParams.get("universite") || "";
  const prefForm = searchParams.get("formation") || "";

  const wizard = useDossierWizardState();
  const {
    step,
    setStep,
    universiteId,
    setUniversiteId,
    formationId,
    setFormationId,
    personalInfo,
    setPersonalInfo,
    pieceRows,
    setPieceRows,
    profil,
    setProfil,
    hasProfil,
    setHasProfil,
    savedBadge,
    setSavedBadge,
    creatingDossier,
    setCreatingDossier,
    submitting,
    setSubmitting,
    togglingPiece,
    setTogglingPiece,
    savingProfil,
    setSavingProfil,
  } = wizard;

  const {
    loadingDossier,
    universites,
    universitesLoading,
    universitesError,
    existingDossier,
    setExistingDossier,
  } = useLoadExistingDossier(prefUniv, prefForm, {
    setUniversiteId,
    setFormationId,
    setPersonalInfo,
    setPieceRows,
    setStep,
    setProfil,
    setHasProfil,
  });

  useAutosaveDossierDraft({
    loadingDossier,
    universitesLoading,
    dossierId: existingDossier?.id,
    dossierEtat: existingDossier?.etat,
    step,
    personalInfo,
    setSavedBadge,
  });

  const uploadPiece = useUploadDossierPiece({
    dossierId: existingDossier?.id,
    setTogglingPiece,
    setPieceRows,
    setExistingDossier,
  });

  const universite = universites.find((item) => item.id === universiteId);
  const formationsForUniv = universite?.formations ?? [];
  const formation = formationsForUniv.find((item) => item.id === formationId);
  const typeEtab =
    universite?.typeEtablissement ??
    existingDossier?.universite?.typeEtablissement ??
    "PRIVE";
  const fraisAgenceAffiche = existingDossier?.fraisAgence ?? resolveFraisAgence(typeEtab);
  const prerequisList = parseStringList(formation?.prerequis);

  const piecesAcademiques = pieceRows.filter((piece) => piece.categorie !== "identite");
  const piecesIdentite = pieceRows.filter((piece) => piece.categorie === "identite");
  const missingObligatoires = listPiecesManquantes(pieceRows);

  const etatUpper = (existingDossier?.etat || "BROUILLON").toUpperCase();
  const isEditable = isDossierEditableByCandidate(etatUpper);
  const canSubmit =
    missingObligatoires.length === 0 && step === DOSSIER_WIZARD_STEPS.RECAP && isEditable;
  const isResubmit = etatUpper === "CORRECTION";
  const etatBadge = etatParCode(etatUpper);

  const saveProfil = async (): Promise<boolean> => {
    setSavingProfil(true);
    try {
      const response = await fetch(API_ROUTES.PROFILE_ACADEMIQUE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profil),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Échec de l'enregistrement");
      setProfil(profilFromApi(data));
      setHasProfil(true);
      if (existingDossier?.id) {
        await refreshPiecesFromDossier(existingDossier.id, {
          setExistingDossier,
          setPieceRows,
        });
      }
      const sync = data.sync as
        | { dossiers?: number; added?: number; removed?: number }
        | undefined;
      if (sync && (sync.added || sync.removed)) {
        toast.success("Profil académique enregistré", {
          description: `Pièces mises à jour : +${sync.added ?? 0} / −${sync.removed ?? 0}`,
        });
      } else {
        toast.success("Profil académique enregistré");
      }
      return true;
    } catch (error: unknown) {
      toast.error("Profil académique", {
        description: error instanceof Error ? error.message : "Erreur",
      });
      return false;
    } finally {
      setSavingProfil(false);
    }
  };

  const createDossierIfNeeded = async (): Promise<DossierWizardData | null> => {
    if (existingDossier) return existingDossier;
    if (!universiteId || !formationId) {
      toast.error("Sélection incomplète", {
        description: "Choisissez une université et une formation.",
      });
      return null;
    }
    if (!hasProfil) {
      toast.error("Profil académique requis", {
        description: "Complétez et enregistrez votre parcours académique (étape 3).",
      });
      return null;
    }
    setCreatingDossier(true);
    try {
      const response = await fetch(API_ROUTES.DOSSIERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universiteId, formationId }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === API_ERROR_CODES.PROFIL_ACADEMIQUE_REQUIS) {
          throw new Error(data.error || "Profil académique requis");
        }
        throw new Error(data.error || "Échec de la création du dossier");
      }
      const created = data as DossierWizardData;
      setExistingDossier(created);
      setPieceRows(created.pieces ?? []);
      toast.success("Dossier créé", { description: `Référence : ${created.reference}` });
      return created;
    } catch (error: unknown) {
      toast.error("Échec de la création", {
        description: error instanceof Error ? error.message : "Erreur",
      });
      return null;
    } finally {
      setCreatingDossier(false);
    }
  };

  const goNext = async () => {
    if (step === DOSSIER_WIZARD_STEPS.UNIVERSITE) {
      if (!universiteId || !formationId) {
        toast.error("Sélection incomplète", {
          description: "Choisissez une université et une formation.",
        });
        return;
      }
      setStep(DOSSIER_WIZARD_STEPS.INFORMATIONS);
      return;
    }
    if (step === DOSSIER_WIZARD_STEPS.INFORMATIONS) {
      setStep(DOSSIER_WIZARD_STEPS.PROFIL_ACADEMIQUE);
      return;
    }
    if (step === DOSSIER_WIZARD_STEPS.PROFIL_ACADEMIQUE) {
      const saved = await saveProfil();
      if (!saved) return;
      const dossier = await createDossierIfNeeded();
      if (!dossier) return;
      setStep(DOSSIER_WIZARD_STEPS.DOCUMENTS);
      return;
    }
    setStep((current) => Math.min(DOSSIER_WIZARD_STEP_COUNT, current + 1));
  };

  const submit = async () => {
    if (!canSubmit) {
      toast.error("Dossier incomplet", {
        description: `${missingObligatoires.length} pièce(s) obligatoire(s) manquante(s).`,
      });
      return;
    }
    const dossierId = existingDossier?.id;
    if (!dossierId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_ROUTES.DOSSIERS}/${dossierId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isResubmit ? "resoumettre" : "soumettre",
          info: {
            prenom: personalInfo.prenom,
            nom: personalInfo.nom,
            telephone: personalInfo.tel,
            nationalite: personalInfo.nationalite,
            ...(personalInfo.naissance
              ? { dateNaissance: personalInfo.naissance }
              : {}),
            ...(personalInfo.adresse ? { adresse: personalInfo.adresse } : {}),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const manquantes = Array.isArray(data.piecesManquantes)
          ? (data.piecesManquantes as string[])
          : [];
        const detail =
          manquantes.length > 0
            ? manquantes.length <= 5
              ? manquantes.join(" · ")
              : `${manquantes.slice(0, 5).join(" · ")} · +${manquantes.length - 5}`
            : data.error || "Échec de la soumission";
        throw new Error(detail);
      }
      toast.success(isResubmit ? "Corrections renvoyées" : "Dossier soumis");
      router.push("/espace");
    } catch (error: unknown) {
      toast.error("Échec de la soumission", {
        description: error instanceof Error ? error.message : "Erreur",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDossier || universitesLoading) return <FormPageSkeleton />;

  if (universitesError) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
        <AlertTitle>Catalogue indisponible</AlertTitle>
        <AlertDescription>
          Impossible de charger les universités.{" "}
          <button type="button" className="underline" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const boardingReference = existingDossier?.reference ?? "Nouveau dossier";
  const boardingEtat = existingDossier?.etat ?? "brouillon";
  const boardingEtape = etatParCode(existingDossier?.etat || "BROUILLON").ordre;
  const boardingMrz =
    existingDossier?.mrz ??
    "GETADM<<NOUVEAU DOSSIER<<<<<<<<<<<<<<\n2026<<EN COURS DE CONSTITUTION<<<<\nREFERENCE A GENERER<<<<<<<<<<<<<<";
  const boardingConseiller = existingDossier?.conseiller
    ? `${existingDossier.conseiller.prenom} ${existingDossier.conseiller.nom}`
    : "Non affecté";

  return (
    <div className="space-y-6">
      {isResubmit && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
          <AlertTitle>Corrections demandées</AlertTitle>
          <AlertDescription>
            Corrigez les pièces marquées « À corriger », puis renvoyez le dossier.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Formulaire de dossier</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isResubmit ? "Corrigez votre dossier." : "Constituez votre dossier."}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {savedBadge && (
            <Badge className="bg-vert-vif/10 font-mono text-[10px] uppercase text-vert-vif">
              <Save className="mr-1 h-3 w-3" /> Brouillon enregistré
            </Badge>
          )}
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase text-muted-foreground"
          >
            {etatBadge.libelle}
          </Badge>
        </div>
      </div>

      <nav aria-label="Étapes du dossier" className="overflow-x-auto scroll-fine">
        <ol className="flex min-w-max items-center gap-1 px-1">
          {WIZARD_STEP_LABELS.map((wizardStep, index) => {
            const done = step > wizardStep.n;
            const active = step === wizardStep.n;
            return (
              <li key={wizardStep.n} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2",
                    active && "bg-primary/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 font-mono text-[11px] font-semibold",
                      done && "border-vert-vif bg-vert-vif text-primary-foreground",
                      active && "border-primary bg-primary text-primary-foreground",
                      !done && !active && "border-border text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      String(wizardStep.n).padStart(2, "0")
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      active
                        ? "text-primary"
                        : done
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {wizardStep.label}
                  </span>
                </div>
                {index < WIZARD_STEP_LABELS.length - 1 && (
                  <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <Card className="border-border bg-card/60 p-6 backdrop-blur-md sm:p-8">
        {step === DOSSIER_WIZARD_STEPS.UNIVERSITE && (
          <DossierStepUniversite
            universites={universites}
            universiteId={universiteId}
            formationId={formationId}
            formationsForUniv={formationsForUniv}
            formation={formation}
            typeEtab={typeEtab}
            fraisAgenceAffiche={fraisAgenceAffiche}
            prerequisList={prerequisList}
            isEditable={isEditable}
            hasExistingDossier={!!existingDossier}
            onUniversiteChange={(id) => {
              setUniversiteId(id);
              const selected = universites.find((item) => item.id === id);
              if (selected?.formations[0]) setFormationId(selected.formations[0].id);
            }}
            onFormationChange={setFormationId}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.INFORMATIONS && (
          <DossierStepInfos
            personalInfo={personalInfo}
            isEditable={isEditable}
            onChange={setPersonalInfo}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.PROFIL_ACADEMIQUE && (
          <DossierStepProfilAcademique
            profil={profil}
            isEditable={isEditable}
            onChange={setProfil}
            formationPiecesRequises={formation?.piecesRequises}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.DOCUMENTS && (
          <DossierStepDocuments
            piecesAcademiques={piecesAcademiques}
            togglingPiece={togglingPiece}
            isEditable={isEditable}
            onUpload={uploadPiece}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.IDENTITE && (
          <DossierStepIdentite
            piecesIdentite={piecesIdentite}
            togglingPiece={togglingPiece}
            isEditable={isEditable}
            onUpload={uploadPiece}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.RECAP && (
          <DossierStepRecap
            personalInfo={personalInfo}
            universite={universite}
            formation={formation}
            typeEtab={typeEtab}
            fraisAgenceAffiche={fraisAgenceAffiche}
            pieceRows={pieceRows}
            missingObligatoires={missingObligatoires}
            boardingReference={boardingReference}
            boardingEtat={boardingEtat}
            boardingEtape={boardingEtape}
            boardingMrz={boardingMrz}
            boardingConseiller={boardingConseiller}
          />
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
          <Button
            variant="ghost"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Étape précédente
          </Button>
          {step < DOSSIER_WIZARD_STEP_COUNT ? (
            <MotionButton
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={goNext}
              disabled={creatingDossier || savingProfil}
            >
              {creatingDossier || savingProfil ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />{" "}
                  Traitement…
                </>
              ) : (
                <>
                  Étape suivante <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
                </>
              )}
            </MotionButton>
          ) : (
            <MotionButton
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={submit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} /> Envoi…
                </>
              ) : canSubmit ? (
                isResubmit ? (
                  <>
                    <Plane className="mr-1.5 h-4 w-4 -rotate-12" /> Renvoyer les corrections
                  </>
                ) : (
                  <>
                    <Plane className="mr-1.5 h-4 w-4 -rotate-12" /> Soumettre mon dossier
                  </>
                )
              ) : (
                <>
                  <Lock className="mr-1.5 h-4 w-4" /> Dossier incomplet
                </>
              )}
            </MotionButton>
          )}
        </div>
      </Card>
    </div>
  );
}
