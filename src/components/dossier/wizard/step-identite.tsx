"use client";

import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/dossier/wizard/upload-zone";
import type { PieceRow } from "@/components/dossier/wizard/types";
import { RefreshCw } from "lucide-react";

export function DossierStepIdentite({
  piecesIdentite,
  togglingPiece,
  isEditable,
  onUpload,
  onRefresh,
}: {
  piecesIdentite: PieceRow[];
  togglingPiece: string | null;
  isEditable: boolean;
  onUpload: (libelle: string, file: File) => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Pièces d&apos;identité</h2>
        <p className="text-sm text-muted-foreground">
          Votre pièce d&apos;identité (Passeport / CNI) est automatiquement vérifiée via votre profil KYC.
        </p>
      </div>

      {piecesIdentite.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">Pièces en préparation</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les emplacements d&apos;upload apparaîtront dès que le dossier aura généré les pièces
            d&apos;identité. Actualisez cette étape si le dossier vient d&apos;être créé.
          </p>
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onRefresh}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Actualiser
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {piecesIdentite.map((piece) => (
            <UploadZone
              key={piece.id}
              libelle={piece.libelle}
              obligatoire
              state={piece.statut}
              loading={togglingPiece === piece.libelle}
              disabled={!isEditable}
              anchorId={piece.code ? `piece-${piece.code}` : null}
              onUpload={(file) => onUpload(piece.libelle, file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
