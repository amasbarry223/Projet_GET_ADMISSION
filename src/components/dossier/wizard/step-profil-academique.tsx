"use client";

import * as React from "react";
import {
  ProfilAcademiqueForm,
  type ProfilAcademiqueFormState,
} from "@/components/dossier/profil-academique-form";
import { pieceGroupLabel, parseStringList } from "@/components/dossier/wizard/types";
import {
  buildPiecesDossier,
  countPiecesByCategorie,
  type PieceCategorie,
} from "@/lib/dossier/pieces-requises";

const CATEGORIE_ORDER: PieceCategorie[] = [
  "academique",
  "justificatif",
  "complementaire",
  "identite",
];

export function DossierStepProfilAcademique({
  profil,
  isEditable,
  onChange,
  formationPiecesRequises,
}: {
  profil: ProfilAcademiqueFormState;
  isEditable: boolean;
  onChange: (next: ProfilAcademiqueFormState) => void;
  formationPiecesRequises?: string[] | string | null;
}) {
  const preview = React.useMemo(
    () => buildPiecesDossier(profil, formationPiecesRequises),
    [profil, formationPiecesRequises],
  );
  const counts = React.useMemo(() => countPiecesByCategorie(preview), [preview]);
  const obligatoires = preview.filter((p) => p.obligatoire).length;
  const optionnels = preview.length - obligatoires;
  const formPieces = parseStringList(formationPiecesRequises);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Profil académique</h2>
        <p className="text-sm text-muted-foreground">
          Les pièces demandées s&apos;adaptent automatiquement à votre parcours (lycée, bac, études,
          redoublements).
        </p>
      </div>
      <ProfilAcademiqueForm
        value={profil}
        onChange={onChange}
        disabled={!isEditable}
        showSaveButton={false}
      />

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aperçu des pièces ({preview.length}) — {obligatoires} obligatoire
          {obligatoires > 1 ? "s" : ""}
          {optionnels > 0 ? ` · ${optionnels} optionnel${optionnels > 1 ? "s" : ""}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {CATEGORIE_ORDER.map((cat) =>
            counts[cat] > 0 ? (
              <span key={cat} className="rounded border border-border bg-background px-2 py-0.5">
                {pieceGroupLabel(cat)} : {counts[cat]}
              </span>
            ) : null,
          )}
        </div>
        {formPieces.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Dont {formPieces.length} pièce(s) complémentaire(s) exigée(s) par la formation
            sélectionnée.
          </p>
        )}
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
          {preview.map((piece) => (
            <li key={piece.code} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary/60" />
              <span>
                {piece.libelle}
                {!piece.obligatoire ? (
                  <span className="text-muted-foreground"> (optionnel)</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
