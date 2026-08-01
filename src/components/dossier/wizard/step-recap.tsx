"use client";

import { BoardingPass } from "@/components/getadm/boarding-pass";
import { RecapLine } from "@/components/dossier/wizard/upload-zone";
import type { Formation, PersonalInfo, PieceRow, Universite } from "@/components/dossier/wizard/types";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function DossierStepRecap({
  personalInfo,
  universite,
  formation,
  typeEtab,
  fraisAgenceAffiche,
  pieceRows,
  missingObligatoires,
  boardingReference,
  boardingEtat,
  boardingEtape,
  boardingMrz,
  boardingConseiller,
}: {
  personalInfo: PersonalInfo;
  universite: Universite | undefined;
  formation: Formation | undefined;
  typeEtab: string;
  fraisAgenceAffiche: number;
  pieceRows: PieceRow[];
  missingObligatoires: PieceRow[];
  boardingReference: string;
  boardingEtat: string;
  boardingEtape: number;
  boardingMrz: string;
  boardingConseiller: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">
          Récapitulatif & soumission
        </h2>
        <p className="text-sm text-muted-foreground">Vérifiez votre dossier avant de le transmettre.</p>
      </div>

      <BoardingPass
        variant="large"
        reference={boardingReference}
        universiteNom={universite?.nom ?? ""}
        formationLabel={`${formation?.niveau ?? ""} · ${formation?.intitule ?? ""}`}
        etat={boardingEtat}
        etapeActuelle={boardingEtape}
        etapeTotal={12}
        conseiller={boardingConseiller}
        fraisAgence={fraisAgenceAffiche}
        mrz={boardingMrz}
      />

      <div className="rounded-md border border-border bg-muted/50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
          Informations
        </p>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <RecapLine
            label="Candidat"
            value={`${personalInfo.prenom} ${personalInfo.nom}`.trim()}
          />
          <RecapLine label="Nationalité" value={personalInfo.nationalite} />
          <RecapLine label="Université" value={universite?.nom ?? ""} />
          <RecapLine label="Type" value={typeEtab === "PUBLIC" ? "Public" : "Privé"} />
          <RecapLine label="Formation" value={formation?.intitule ?? ""} />
          <RecapLine label="Frais d'agence" value={formatFCFA(fraisAgenceAffiche)} />
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
          Pièces ({pieceRows.length - missingObligatoires.length}/{pieceRows.length} — obligatoires
          manquantes : {missingObligatoires.length})
        </p>
        <ul className="mt-2 space-y-1.5">
          {pieceRows.map((piece) => {
            const statut = piece.statut ?? "manquante";
            return (
              <li key={piece.id} className="flex items-center gap-2 text-sm">
                {statut === "manquante" || statut === "a_corriger" ? (
                  <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-vert-vif" strokeWidth={1.5} />
                )}
                <span
                  className={cn(
                    statut === "manquante" ? "text-destructive" : "text-foreground",
                  )}
                >
                  {piece.libelle}
                  {piece.obligatoire === false ? " (optionnel)" : ""}
                </span>
                <span className="ml-auto font-mono text-[10px] uppercase text-muted-foreground">
                  {statut.replace("_", " ")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {missingObligatoires.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-destructive" strokeWidth={1.5} />
          <div className="text-sm text-destructive">
            <p className="font-medium">
              {missingObligatoires.length} pièce(s) obligatoire(s) manquante(s) :
            </p>
            <ul className="mt-1 list-inside list-disc">
              {missingObligatoires.map((piece) => (
                <li key={piece.id}>{piece.libelle}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
