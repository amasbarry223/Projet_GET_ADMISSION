"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/site/motion-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateFR } from "@/lib/format";
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
import { isPiecePassportOrCni, listPiecesManquantes } from "@/lib/dossier/pieces-requises";
import { etatParCode } from "@/lib/etats";
import { toastApiErrorSync, toastApiSuccess } from "@/lib/toast-api";
import { wizardPersonalInfoSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import type { InfosFieldErrors } from "@/components/dossier/wizard/step-infos";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  CheckCircle2,
  Clock,
  Send,
  Lock,
  Plane,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  API_ERROR_CODES,
  API_ROUTES,
  DOSSIER_WIZARD_STEP_COUNT,
  DOSSIER_WIZARD_STEPS,
  ETAPE_PAR_ETAT,
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
  const isNouvelle = searchParams.get("nouvelle") === "true";
  const sourceIdParam = searchParams.get("sourceId");

  const wizard = useDossierWizardState();
  const {
    step,
    setStep,
    procedure,
    setProcedure,
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
    autosaveStatus,
    setAutosaveStatus,
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
    dossierError,
    reloadDossier,
    universites,
    universitesLoading,
    universitesError,
    existingDossier,
    setExistingDossier,
  } = useLoadExistingDossier(
    prefUniv,
    prefForm,
    {
      setProcedure,
      setUniversiteId,
      setFormationId,
      setPersonalInfo,
      setPieceRows,
      setStep,
      setProfil,
      setHasProfil,
    },
    isNouvelle,
  );

  useAutosaveDossierDraft({
    loadingDossier,
    universitesLoading,
    dossierId: existingDossier?.id,
    dossierEtat: existingDossier?.etat,
    step,
    personalInfo,
    setAutosaveStatus,
  });

  const [infosFieldErrors, setInfosFieldErrors] = React.useState<InfosFieldErrors>({});

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

  // Filtrage strict : Aucune pièce passeport / CNI ne doit figurer dans les pièces justificatives (géré exclusivement par KYC)
  const visiblePieces = React.useMemo(() => {
    return pieceRows.filter((piece) => !isPiecePassportOrCni(piece));
  }, [pieceRows]);

  const piecesAcademiques = React.useMemo(() => {
    return visiblePieces.filter((piece) => piece.categorie !== "identite");
  }, [visiblePieces]);

  const [userProfile, setUserProfile] = React.useState<{
    kycType?: string | null;
    kycNumero?: string | null;
    kycRectoPath?: string | null;
    kycVersoPath?: string | null;
    kycVerifie?: boolean;
  } | null>(null);

  React.useEffect(() => {
    fetch(API_ROUTES.PROFILE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setUserProfile(d);
      })
      .catch(() => null);
  }, []);

  const isKycComplete = Boolean(
    userProfile?.kycNumero?.trim() && userProfile?.kycRectoPath,
  );

  const missingObligatoires = listPiecesManquantes(visiblePieces);
  const etatUpper = (existingDossier?.etat || "BROUILLON").toUpperCase();
  const isEditable = isDossierEditableByCandidate(etatUpper);
  const canSubmit =
    missingObligatoires.length === 0 && isKycComplete && step === DOSSIER_WIZARD_STEPS.RECAP && isEditable;
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
      if (!response.ok) {
        toastApiErrorSync(response.status, { title: "Profil académique", body: data });
        return false;
      }
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
        toastApiSuccess(
          "Profil académique enregistré",
          `Pièces mises à jour : +${sync.added ?? 0} / −${sync.removed ?? 0}`,
        );
      } else {
        toastApiSuccess("Profil académique enregistré");
      }
      return true;
    } catch (error: unknown) {
      toastApiErrorSync(error, { title: "Profil académique" });
      return false;
    } finally {
      setSavingProfil(false);
    }
  };

  const createDossierIfNeeded = async (hasProfilValid = false): Promise<DossierWizardData | null> => {
    if (existingDossier) return existingDossier;
    if (procedure === "PRIVEE" && (!universiteId || !formationId)) {
      toastApiErrorSync(new Error("Choisissez une université et une formation."), {
        title: "Sélection incomplète",
      });
      return null;
    }
    if (!hasProfil && !hasProfilValid) {
      toastApiErrorSync(
        new Error("Complétez et enregistrez votre parcours académique (étape 3)."),
        { title: "Profil académique requis" },
      );
      return null;
    }
    setCreatingDossier(true);
    const effectiveSourceId = sourceIdParam || undefined;

    try {
      const response = await fetch(API_ROUTES.DOSSIERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          procedure === "PUBLIQUE"
            ? { procedure, sourceDossierId: effectiveSourceId }
            : { procedure, universiteId, formationId, sourceDossierId: effectiveSourceId },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === API_ERROR_CODES.PROFIL_ACADEMIQUE_REQUIS) {
          toastApiErrorSync(response.status, {
            title: "Profil académique requis",
            body: data,
          });
          return null;
        }
        toastApiErrorSync(response.status, {
          title: "Création du dossier impossible",
          body: data,
        });
        return null;
      }
      const created = data as DossierWizardData;
      setExistingDossier(created);
      setPieceRows(created.pieces ?? []);
      toastApiSuccess("Dossier créé", `Référence : ${created.reference}`);
      return created;
    } catch (error: unknown) {
      toastApiErrorSync(error, { title: "Création du dossier impossible" });
      return null;
    } finally {
      setCreatingDossier(false);
    }
  };

  const validateInfosStep = (): boolean => {
    const result = wizardPersonalInfoSchema.safeParse(personalInfo);
    if (result.success) {
      setInfosFieldErrors({});
      return true;
    }
    const next: InfosFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof InfosFieldErrors;
      if (key && !next[key]) next[key] = issue.message;
    }
    setInfosFieldErrors(next);
    toastApiErrorSync(new Error("Corrigez les champs indiqués avant de continuer."), {
      title: "Informations incomplètes",
    });
    const firstKey = Object.keys(next)[0];
    if (firstKey && typeof document !== "undefined") {
      window.setTimeout(() => {
        document.getElementById(`infos-${firstKey}`)?.focus();
      }, 50);
    }
    return false;
  };

  const handleSaveKycInfo = async (data: { kycType: string; kycNumero: string }): Promise<boolean> => {
    try {
      const res = await fetch(API_ROUTES.PROFILE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: personalInfo.prenom,
          nom: personalInfo.nom,
          telephone: personalInfo.tel,
          nationalite: personalInfo.nationalite,
          ...(personalInfo.naissance ? { dateNaissance: personalInfo.naissance } : {}),
          adresse: personalInfo.adresse,
          kycType: data.kycType,
          kycNumero: data.kycNumero,
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastApiErrorSync(res.status, { title: "Pièce d'identité", body: resData });
        return false;
      }
      setUserProfile((prev) => ({
        ...prev,
        kycType: data.kycType,
        kycNumero: data.kycNumero,
      }));
      toastApiSuccess("Informations d'identité enregistrées");
      return true;
    } catch (e) {
      toastApiErrorSync(e, { title: "Pièce d'identité" });
      return false;
    }
  };

  const handleUploadKycFile = async (file: File, side: "recto"): Promise<boolean> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("side", side);
      if (userProfile?.kycType) fd.append("kycType", userProfile.kycType);
      if (userProfile?.kycNumero) fd.append("kycNumero", userProfile.kycNumero);

      const res = await fetch("/api/profile/kyc", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastApiErrorSync(res.status, { title: "Pièce d'identité", body: data });
        return false;
      }
      setUserProfile((prev) => ({
        ...prev,
        kycRectoPath: data.uploaded?.cheminRelatif || "uploaded",
        kycType: data.user?.kycType || prev?.kycType,
        kycNumero: data.user?.kycNumero || prev?.kycNumero,
      }));
      toastApiSuccess("Pièce d'identité téléversée");
      return true;
    } catch (e) {
      toastApiErrorSync(e, { title: "Pièce d'identité" });
      return false;
    }
  };

  const nextStep = async () => {
    if (step === DOSSIER_WIZARD_STEPS.UNIVERSITE) {
      if (procedure === "PRIVEE" && (!universiteId || !formationId)) {
        toastApiErrorSync(
          new Error("Veuillez sélectionner un établissement et une formation."),
          { title: "Sélection requise" },
        );
        return;
      }
      setStep(DOSSIER_WIZARD_STEPS.INFORMATIONS);
      return;
    }
    if (step === DOSSIER_WIZARD_STEPS.INFORMATIONS) {
      if (!validateInfosStep()) return;
      setStep(DOSSIER_WIZARD_STEPS.PROFIL_ACADEMIQUE);
      return;
    }
    if (step === DOSSIER_WIZARD_STEPS.PROFIL_ACADEMIQUE) {
      const saved = await saveProfil();
      if (!saved) return;
      const dossier = await createDossierIfNeeded(true);
      if (!dossier) return;
      setStep(DOSSIER_WIZARD_STEPS.DOCUMENTS);
      return;
    }
    if (step === DOSSIER_WIZARD_STEPS.DOCUMENTS) {
      const manquantes = listPiecesManquantes(piecesAcademiques);
      if (manquantes.length > 0) {
        toastApiErrorSync(
          new Error(`${manquantes.length} document(s) obligatoire(s) manquant(s).`),
          { title: "Documents incomplets" },
        );
        return;
      }
      setStep(DOSSIER_WIZARD_STEPS.IDENTITE);
      return;
    }
    if (step === DOSSIER_WIZARD_STEPS.IDENTITE) {
      if (!isKycComplete) {
        toastApiErrorSync(
          new Error("Veuillez renseigner le numéro et téléverser votre pièce d'identité avant de continuer."),
          { title: "Pièce d'identité incomplète" },
        );
        return;
      }
      setStep(DOSSIER_WIZARD_STEPS.RECAP);
      return;
    }
    setStep((current) => Math.min(DOSSIER_WIZARD_STEP_COUNT, current + 1));
  };
  const goNext = nextStep;

  const submit = async () => {
    if (!isKycComplete) {
      toastApiErrorSync(
        new Error("Vous devez renseigner le numéro et téléverser votre pièce d'identité (Étape 5) avant de soumettre votre dossier."),
        { title: "Pièce d'identité requise" },
      );
      setStep(DOSSIER_WIZARD_STEPS.IDENTITE);
      return;
    }
    if (!canSubmit) {
      toastApiErrorSync(
        new Error(`${missingObligatoires.length} pièce(s) obligatoire(s) manquante(s).`),
        { title: "Dossier incomplet" },
      );
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
            : undefined;
        toastApiErrorSync(response.status, {
          title: "Soumission impossible",
          ...(detail !== undefined ? { description: detail } : {}),
          body: data,
        });
        if (manquantes.length > 0) setStep(DOSSIER_WIZARD_STEPS.DOCUMENTS);
        return;
      }
      toastApiSuccess(isResubmit ? "Corrections renvoyées" : "Dossier soumis");
      router.push("/espace");
    } catch (error: unknown) {
      toastApiErrorSync(error, { title: "Soumission impossible" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDossier || universitesLoading) return <FormPageSkeleton />;

  if (dossierError) {
    return (
      <Alert className="border-destructive/40 bg-destructive/5">
        <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
        <AlertTitle>Dossier indisponible</AlertTitle>
        <AlertDescription>
          Impossible de charger votre dossier.{" "}
          <button type="button" className="underline" onClick={reloadDossier}>
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

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

  const demandesCorrection = existingDossier?.demandesCorrection ?? [];
  const motifCorrectionActuel = demandesCorrection[0]?.motif ?? null;
  const historiqueMotifs = demandesCorrection.slice(1);

  const isLockedInFlight = !isEditable && !isResubmit && etatUpper !== "REFUSE" && etatUpper !== "CLOTURE";
  const etapeCourante = ETAPE_PAR_ETAT[etatUpper as keyof typeof ETAPE_PAR_ETAT] ?? 0;
  // "Validé" au sens strict : le conseiller a vérifié le dossier et l'a laissé passer (donc à
  // partir de PAIEMENT_ATTENTE). Avant ça (Soumis, En vérification), rien n'a encore été validé —
  // annoncer une validation prématurément induirait le candidat en erreur.
  const isDossierValide = isLockedInFlight && etapeCourante >= ETAPE_PAR_ETAT.PAIEMENT_ATTENTE;
  const isEnAttenteTraitement = isLockedInFlight && etatUpper === "SOUMIS";
  const isEnVerification = isLockedInFlight && etatUpper === "VERIFICATION";

  return (
    <div className="space-y-6">
      {etatUpper === "REFUSE" && !isNouvelle && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                <h2 className="font-display text-base font-bold text-foreground">
                  Candidature refusée par l&apos;établissement
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ce dossier a été décliné. Vous pouvez dès maintenant déposer une <strong>nouvelle candidature</strong> dans un autre établissement privé ou en procédure publique. Vos pièces déjà fournies seront automatiquement récupérées.
              </p>
            </div>
            <MotionButton asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 flex-none">
              <Link href={`/espace/dossier?nouvelle=true&sourceId=${existingDossier?.id}`}>
                Déposer une nouvelle candidature <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </MotionButton>
          </div>
        </div>
      )}

      {isDossierValide && (
        <Alert className="border-vert/40 bg-vert/5">
          <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.5} />
          <AlertTitle>Dossier validé avec succès !</AlertTitle>
          <AlertDescription>
            Votre conseiller a vérifié et validé votre dossier ; il ne peut plus être modifié.{" "}
            {etatBadge.description}
          </AlertDescription>
        </Alert>
      )}
      {isEnAttenteTraitement && (
        <Alert className="border-ambre/40 bg-ambre/5">
          <Send className="h-4 w-4 text-ambre" strokeWidth={1.5} />
          <AlertTitle>Dossier soumis — en attente de prise en charge</AlertTitle>
          <AlertDescription>
            Votre dossier a bien été transmis à l&apos;agence et ne peut plus être modifié. Un
            conseiller va prochainement l&apos;examiner.
          </AlertDescription>
        </Alert>
      )}
      {isEnVerification && (
        <Alert className="border-ambre/40 bg-ambre/5">
          <Clock className="h-4 w-4 text-ambre" strokeWidth={1.5} />
          <AlertTitle>Vérification en cours</AlertTitle>
          <AlertDescription>
            Votre conseiller vérifie actuellement l&apos;éligibilité et la complétude de votre
            dossier. Vous serez notifié dès que la vérification sera terminée.
          </AlertDescription>
        </Alert>
      )}
      {isResubmit && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
          <AlertTitle>Corrections demandées</AlertTitle>
          <AlertDescription>
            {motifCorrectionActuel ? (
              <>Votre conseiller a demandé une correction : « {motifCorrectionActuel} »</>
            ) : (
              "Corrigez les pièces marquées « À corriger », puis renvoyez le dossier."
            )}
            {historiqueMotifs.length > 0 && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-amber-700">
                  {historiqueMotifs.length} motif(s) précédent(s)
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {historiqueMotifs.map((m) => (
                    <li key={m.id} className="text-muted-foreground">
                      <span className="font-mono text-xs">{formatDateFR(m.createdAt)}</span> — {m.motif}
                    </li>
                  ))}
                </ul>
              </details>
            )}
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
          {autosaveStatus === "saved" && (
            <Badge className="bg-vert-vif/10 font-mono text-[10px] uppercase text-vert-vif">
              <Save className="mr-1 h-3 w-3" /> Brouillon enregistré
            </Badge>
          )}
          {autosaveStatus === "error" && (
            <Badge
              variant="outline"
              className="border-carmin/40 font-mono text-[10px] uppercase text-carmin"
            >
              <AlertTriangle className="mr-1 h-3 w-3" /> Échec de sauvegarde
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
            const canJump = done || active;
            return (
              <li
                key={wizardStep.n}
                className="flex items-center"
                aria-current={active ? "step" : undefined}
              >
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => {
                    if (canJump) setStep(wizardStep.n);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis/40",
                    active && "bg-primary/10",
                    canJump ? "cursor-pointer hover:bg-muted/60" : "cursor-default opacity-80",
                  )}
                  aria-label={`Étape ${wizardStep.n} : ${wizardStep.label}`}
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
                </button>
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
            procedure={procedure}
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
            onProcedureChange={setProcedure}
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
            fieldErrors={infosFieldErrors}
            onChange={(next) => {
              setPersonalInfo(next);
              setInfosFieldErrors({});
            }}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.PROFIL_ACADEMIQUE && (
          <DossierStepProfilAcademique
            profil={profil}
            isEditable={isEditable}
            onChange={setProfil}
            {...(formation?.piecesRequises != null
              ? { formationPiecesRequises: formation.piecesRequises }
              : {})}
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
            kycData={userProfile}
            isEditable={isEditable}
            onSaveKycInfo={handleSaveKycInfo}
            onUploadKycFile={handleUploadKycFile}
          />
        )}

        {step === DOSSIER_WIZARD_STEPS.RECAP && (
          <DossierStepRecap
            personalInfo={personalInfo}
            universite={universite}
            formation={formation}
            typeEtab={typeEtab}
            fraisAgenceAffiche={fraisAgenceAffiche}
            pieceRows={visiblePieces}
            missingObligatoires={missingObligatoires}
            isKycComplete={isKycComplete}
            boardingReference={boardingReference}
            boardingEtat={boardingEtat}
            boardingEtape={boardingEtape}
            boardingMrz={boardingMrz}
            boardingConseiller={boardingConseiller}
            onCompleterKyc={() => setStep(DOSSIER_WIZARD_STEPS.IDENTITE)}
            onCompleterDocuments={(pieceCode) => {
              setStep(DOSSIER_WIZARD_STEPS.DOCUMENTS);
              if (pieceCode && typeof document !== "undefined") {
                window.setTimeout(() => {
                  document
                    .getElementById(`piece-${pieceCode}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 120);
              }
            }}
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
          ) : !isEditable ? (
            // Dossier déjà soumis / verrouillé (validé, en vérification, refusé…) — le statut
            // est déjà annoncé par la bannière en haut de page ; pas de bouton d'action ici,
            // et surtout pas "Dossier incomplet" qui laisserait croire à des pièces manquantes.
            <div />
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
