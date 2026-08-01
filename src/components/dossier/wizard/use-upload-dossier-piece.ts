"use client";

import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type {
  DossierWizardData,
  PieceRow,
  PieceState,
} from "@/components/dossier/wizard/types";
import { API_ROUTES, PIECE_STATUSES } from "@/shared/constants";

export async function refreshPiecesFromDossier(
  dossierId: string,
  setters: {
    setExistingDossier: (dossier: DossierWizardData) => void;
    setPieceRows: Dispatch<SetStateAction<PieceRow[]>>;
  },
) {
  const response = await fetch(`${API_ROUTES.DOSSIERS}/${dossierId}`);
  if (!response.ok) return;
  const dossier = (await response.json()) as DossierWizardData;
  setters.setExistingDossier(dossier);
  setters.setPieceRows(dossier.pieces ?? []);
}

export function useUploadDossierPiece(params: {
  dossierId: string | undefined;
  setTogglingPiece: (libelle: string | null) => void;
  setPieceRows: Dispatch<SetStateAction<PieceRow[]>>;
  setExistingDossier: (dossier: DossierWizardData) => void;
}) {
  const { dossierId, setTogglingPiece, setPieceRows, setExistingDossier } = params;

  return async function uploadPiece(libelle: string, file: File) {
    if (!dossierId) {
      toast.error("Dossier non créé", {
        description: "Finalisez d'abord le profil académique.",
      });
      return;
    }
    setTogglingPiece(libelle);
    setPieceRows((previous) =>
      previous.map((piece) =>
        piece.libelle === libelle
          ? { ...piece, statut: PIECE_STATUSES.TELEVERSEE as PieceState }
          : piece,
      ),
    );
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("libelle", libelle);
      const response = await fetch(`${API_ROUTES.DOSSIERS}/${dossierId}/pieces`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Échec de l'upload");
      }
      toast.success("Pièce téléversée", { description: file.name });
      await refreshPiecesFromDossier(dossierId, {
        setExistingDossier,
        setPieceRows,
      });
    } catch (error: unknown) {
      setPieceRows((previous) =>
        previous.map((piece) =>
          piece.libelle === libelle
            ? { ...piece, statut: PIECE_STATUSES.MANQUANTE as PieceState }
            : piece,
        ),
      );
      toast.error("Upload échoué", {
        description: error instanceof Error ? error.message : "Erreur",
      });
    } finally {
      setTogglingPiece(null);
    }
  };
}
