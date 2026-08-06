"use client";

import { UploadZone } from "@/components/dossier/wizard/upload-zone";
import { pieceGroupLabel, type PieceRow } from "@/components/dossier/wizard/types";

export function DossierStepDocuments({
  piecesAcademiques,
  togglingPiece,
  isEditable,
  onUpload,
}: {
  piecesAcademiques: PieceRow[];
  togglingPiece: string | null;
  isEditable: boolean;
  onUpload: (libelle: string, file: File) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Documents académiques</h2>
        <p className="text-sm text-muted-foreground">
          Liste générée selon votre profil. PDF, JPG ou PNG (10 Mo max).
        </p>
      </div>
      {piecesAcademiques.length === 0 ? (
        <p className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          Aucune pièce encore. Revenez à l&apos;étape profil académique pour générer la liste.
        </p>
      ) : (
        <div className="space-y-6">
          {(["academique", "justificatif", "complementaire"] as const).map((categorie) => {
            const group = piecesAcademiques.filter(
              (piece) => (piece.categorie || "academique") === categorie,
            );
            if (group.length === 0) return null;
            return (
              <div key={categorie} className="space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {pieceGroupLabel(categorie)}
                </p>
                {group.map((piece) => (
                  <UploadZone
                    key={piece.id}
                    libelle={piece.libelle}
                    obligatoire={piece.obligatoire !== false}
                    state={piece.statut}
                    loading={togglingPiece === piece.libelle}
                    disabled={!isEditable}
                    anchorId={piece.code ? `piece-${piece.code}` : null}
                    onUpload={(file) => onUpload(piece.libelle, file)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
