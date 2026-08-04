"use client";

import * as React from "react";
import type { PersonalInfo } from "@/components/dossier/wizard/types";
import { toastApiErrorSync } from "@/lib/toast-api";
import {
  DOSSIER_AUTOSAVE_DEBOUNCE_MS,
  DOSSIER_SAVED_BADGE_VISIBLE_MS,
  isDossierEditableByCandidate,
} from "@/shared/constants";

export type AutosaveStatus = "idle" | "saved" | "error";

export function useAutosaveDossierDraft(params: {
  loadingDossier: boolean;
  universitesLoading: boolean;
  dossierId: string | undefined;
  dossierEtat: string | undefined;
  step: number;
  personalInfo: PersonalInfo;
  setAutosaveStatus: (status: AutosaveStatus) => void;
}) {
  const {
    loadingDossier,
    universitesLoading,
    dossierId,
    dossierEtat,
    step,
    personalInfo,
    setAutosaveStatus,
  } = params;

  const failCountRef = React.useRef(0);

  React.useEffect(() => {
    if (loadingDossier || universitesLoading || !dossierId) return;
    const etat = (dossierEtat || "").toUpperCase();
    if (!isDossierEditableByCandidate(etat)) return;

    const autosaveTimerId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/dossiers/${dossierId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            etapeActuelle: step,
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
        if (response.ok) {
          failCountRef.current = 0;
          setAutosaveStatus("saved");
          setTimeout(() => setAutosaveStatus("idle"), DOSSIER_SAVED_BADGE_VISIBLE_MS);
          return;
        }
        failCountRef.current += 1;
        setAutosaveStatus("error");
        if (failCountRef.current >= 2) {
          const body = await response.json().catch(() => ({}));
          toastApiErrorSync(response.status, {
            title: "Brouillon non enregistré",
            body,
          });
        }
      } catch (error) {
        failCountRef.current += 1;
        setAutosaveStatus("error");
        if (failCountRef.current >= 2) {
          toastApiErrorSync(error, { title: "Brouillon non enregistré" });
        }
      }
    }, DOSSIER_AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(autosaveTimerId);
  }, [
    step,
    personalInfo,
    dossierId,
    dossierEtat,
    loadingDossier,
    universitesLoading,
    setAutosaveStatus,
  ]);
}
