"use client";

import * as React from "react";
import {
  emptyProfilAcademique,
  profilFromApi,
  type ProfilAcademiqueFormState,
} from "@/components/dossier/profil-academique-form";
import type {
  DossierWizardData,
  PersonalInfo,
  PieceRow,
  TypeProcedure,
  Universite,
} from "@/components/dossier/wizard/types";
import {
  API_ROUTES,
  DOSSIER_WIZARD_STEP_COUNT,
  DOSSIER_WIZARD_STEPS,
  isDossierEditableByCandidate,
} from "@/shared/constants";
import { pickPrimaryDossier } from "@/lib/dossier/pick-dossier";
import { runAsyncEffect } from "@/lib/run-async-effect";

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const raw = typeof value === "string" ? value : value.toISOString();
  return raw.slice(0, 10);
}

export function useDossierWizardState() {
  const [step, setStep] = React.useState(1);
  const [procedure, setProcedure] = React.useState<TypeProcedure>("PRIVEE");
  const [universiteId, setUniversiteId] = React.useState("");
  const [formationId, setFormationId] = React.useState("");
  const [personalInfo, setPersonalInfo] = React.useState<PersonalInfo>({
    nom: "",
    prenom: "",
    naissance: "",
    nationalite: "",
    email: "",
    tel: "",
    adresse: "",
  });
  const [pieceRows, setPieceRows] = React.useState<PieceRow[]>([]);
  const [profil, setProfil] = React.useState<ProfilAcademiqueFormState>(emptyProfilAcademique());
  const [hasProfil, setHasProfil] = React.useState(false);
  const [autosaveStatus, setAutosaveStatus] = React.useState<"idle" | "saved" | "error">("idle");
  const [creatingDossier, setCreatingDossier] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [togglingPiece, setTogglingPiece] = React.useState<string | null>(null);
  const [savingProfil, setSavingProfil] = React.useState(false);

  return {
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
  };
}

type LoadSetters = {
  setProcedure: (procedure: TypeProcedure) => void;
  setUniversiteId: (id: string) => void;
  setFormationId: (id: string) => void;
  setPersonalInfo: React.Dispatch<React.SetStateAction<PersonalInfo>>;
  setPieceRows: React.Dispatch<React.SetStateAction<PieceRow[]>>;
  setStep: (step: number) => void;
  setProfil: (profil: ProfilAcademiqueFormState) => void;
  setHasProfil: (value: boolean) => void;
};

type ProfileHydration = {
  nom?: string;
  prenom?: string;
  nationalite?: string | null;
  email?: string;
  telephone?: string | null;
  dateNaissance?: string | Date | null;
  adresse?: string | null;
};

export function useLoadExistingDossier(
  prefUniv: string,
  prefForm: string,
  setters: LoadSetters,
) {
  const [loadingDossier, setLoadingDossier] = React.useState(true);
  const [dossierError, setDossierError] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [universites, setUniversites] = React.useState<Universite[]>([]);
  const [universitesLoading, setUniversitesLoading] = React.useState(true);
  const [universitesError, setUniversitesError] = React.useState(false);
  const [existingDossier, setExistingDossier] = React.useState<DossierWizardData | null>(null);
  const profileRef = React.useRef<ProfileHydration | null>(null);

  const settersRef = React.useRef(setters);
  React.useEffect(() => {
    settersRef.current = setters;
  });

  const reloadDossier = React.useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  React.useEffect(() => {
    fetch(API_ROUTES.UNIVERSITES)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: Universite[]) => {
        setUniversites(data);
        setUniversitesLoading(false);
      })
      .catch(() => {
        setUniversitesError(true);
        setUniversitesLoading(false);
      });
  }, []);

  React.useEffect(() => {
    fetch(API_ROUTES.PROFILE_ACADEMIQUE)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          settersRef.current.setProfil(profilFromApi(data));
          settersRef.current.setHasProfil(true);
        }
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    fetch(API_ROUTES.PROFILE)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ProfileHydration | null) => {
        if (!data) return;
        profileRef.current = data;
        settersRef.current.setPersonalInfo((prev) => ({
          ...prev,
          nom: prev.nom || data.nom || "",
          prenom: prev.prenom || data.prenom || "",
          nationalite: prev.nationalite || data.nationalite || "",
          email: prev.email || data.email || "",
          tel: prev.tel || data.telephone || "",
          naissance: prev.naissance || toDateInputValue(data.dateNaissance),
          adresse: prev.adresse || data.adresse || "",
        }));
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const stop = runAsyncEffect(() => {
      if (cancelled) return;
      setLoadingDossier(true);
      setDossierError(false);

      fetch(API_ROUTES.DOSSIERS)
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
        .then((data: DossierWizardData[]) => {
          if (cancelled) return;
          const list = Array.isArray(data) ? data : [];
          const editable = list.filter((d) =>
            isDossierEditableByCandidate((d.etat || "").toUpperCase()),
          );
          const dossier =
            pickPrimaryDossier(
              (editable.length > 0 ? editable : list).map((d) => ({
                ...d,
                updatedAt: (d as { updatedAt?: string }).updatedAt ?? new Date(0).toISOString(),
              })),
            ) ?? null;
          if (dossier) {
            setExistingDossier(dossier);
            const s = settersRef.current;
            const profile = profileRef.current;
            s.setProcedure(dossier.procedure ?? "PRIVEE");
            s.setUniversiteId(dossier.universite.id);
            s.setFormationId(dossier.formation.id);
            s.setPersonalInfo({
              nom: dossier.candidat.nom || profile?.nom || "",
              prenom: dossier.candidat.prenom || profile?.prenom || "",
              naissance: toDateInputValue(profile?.dateNaissance),
              nationalite: dossier.candidat.nationalite || profile?.nationalite || "",
              email: dossier.candidat.email || profile?.email || "",
              tel: dossier.candidat.telephone || profile?.telephone || "",
              adresse: profile?.adresse || "",
            });
            s.setPieceRows(dossier.pieces ?? []);
            const etat = (dossier.etat || "").toUpperCase();
            if (isDossierEditableByCandidate(etat)) {
              const restored = Math.min(
                DOSSIER_WIZARD_STEP_COUNT,
                Math.max(1, dossier.etapeActuelle || 1),
              );
              s.setStep(
                etat === "CORRECTION" && restored < DOSSIER_WIZARD_STEPS.DOCUMENTS
                  ? DOSSIER_WIZARD_STEPS.DOCUMENTS
                  : restored,
              );
            } else {
              s.setStep(DOSSIER_WIZARD_STEPS.RECAP);
            }
          } else {
            setExistingDossier(null);
          }
          setLoadingDossier(false);
        })
        .catch(() => {
          if (cancelled) return;
          setDossierError(true);
          setLoadingDossier(false);
        });
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [reloadToken]);

  React.useEffect(() => {
    if (loadingDossier || universitesLoading || existingDossier) return;
    const s = settersRef.current;
    if (prefUniv && universites.some((universite) => universite.id === prefUniv)) {
      s.setUniversiteId(prefUniv);
      const universite = universites.find((item) => item.id === prefUniv);
      if (prefForm && universite?.formations.some((formation) => formation.id === prefForm)) {
        s.setFormationId(prefForm);
      }
      return;
    }
    if (prefForm) {
      for (const universite of universites) {
        if (universite.formations.some((formation) => formation.id === prefForm)) {
          s.setUniversiteId(universite.id);
          s.setFormationId(prefForm);
          break;
        }
      }
    }
  }, [loadingDossier, universitesLoading, universites, prefUniv, prefForm, existingDossier]);

  return {
    loadingDossier,
    dossierError,
    reloadDossier,
    universites,
    universitesLoading,
    universitesError,
    existingDossier,
    setExistingDossier,
  };
}
