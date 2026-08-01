"use client";

import * as React from "react";
import type { PersonalInfo } from "@/components/dossier/wizard/types";
import {
  DOSSIER_AUTOSAVE_DEBOUNCE_MS,
  DOSSIER_SAVED_BADGE_VISIBLE_MS,
  isDossierEditableByCandidate,
} from "@/shared/constants";

export function useAutosaveDossierDraft(params: {
  loadingDossier: boolean;
  universitesLoading: boolean;
  dossierId: string | undefined;
  dossierEtat: string | undefined;
  step: number;
  personalInfo: PersonalInfo;
  setSavedBadge: (visible: boolean) => void;
}) {
  const {
    loadingDossier,
    universitesLoading,
    dossierId,
    dossierEtat,
    step,
    personalInfo,
    setSavedBadge,
  } = params;

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
          setSavedBadge(true);
          setTimeout(() => setSavedBadge(false), DOSSIER_SAVED_BADGE_VISIBLE_MS);
        }
      } catch {
        /* ignore */
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
    setSavedBadge,
  ]);
}
