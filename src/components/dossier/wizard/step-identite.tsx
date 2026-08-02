"use client";

import { UploadZone } from "@/components/dossier/wizard/upload-zone";
import type { PieceRow, PieceState } from "@/components/dossier/wizard/types";

const FALLBACK_IDENTITE: PieceRow[] = [
  {
    id: "id1",
    libelle: "Passeport ou CNI (page photo)",
    statut: "manquante" as PieceState,
    obligatoire: true,
  },
  {
    id: "id2",
    libelle: "Photo d'identité récente",
    statut: "manquante" as PieceState,
    obligatoire: true,
  },
];

export function DossierStepIdentite({
  piecesIdentite,
  togglingPiece,
  isEditable,
  onUpload,
}: {
  piecesIdentite: PieceRow[];
  togglingPiece: string | null;
  isEditable: boolean;
  onUpload: (libelle: string, file: File) => void;
}) {
  const rows = piecesIdentite.length > 0 ? piecesIdentite : FALLBACK_IDENTITE;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Pièces d&apos;identité</h2>
        <p className="text-sm text-muted-foreground">Passeport ou CNI, et photo d&apos;identité.</p>
      </div>
      <div className="space-y-3">
        {rows.map((piece) => (
          <UploadZone
            key={piece.id}
            libelle={piece.libelle}
            obligatoire
            state={piece.statut}
            loading={togglingPiece === piece.libelle}
            disabled={!isEditable}
            anchorId={piece.code ? `piece-${piece.code}` : undefined}
            onUpload={(file) => onUpload(piece.libelle, file)}
          />
        ))}
      </div>
    </div>
  );
}
