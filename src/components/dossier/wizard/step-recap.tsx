"use client";

import Link from "next/link";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { RecapLine } from "@/components/dossier/wizard/upload-zone";
import type { Formation, PersonalInfo, PieceRow, Universite } from "@/components/dossier/wizard/types";
import { isPiecePassportOrCni } from "@/lib/dossier/pieces-requises";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DossierStepRecap({
  personalInfo,
  universite,
  formation,
  typeEtab,
  fraisAgenceAffiche,
  pieceRows,
  missingObligatoires,
  isKycComplete = true,
  boardingReference,
  boardingEtat,
  boardingEtape,
  boardingMrz,
  boardingConseiller,
  onCompleterDocuments,
}: {
  personalInfo: PersonalInfo;
  universite: Universite | undefined;
  formation: Formation | undefined;
  typeEtab: string;
  fraisAgenceAffiche: number;
  pieceRows: PieceRow[];
  missingObligatoires: PieceRow[];
  isKycComplete?: boolean;
  boardingReference: string;
  boardingEtat: string;
  boardingEtape: number;
  boardingMrz: string;
  boardingConseiller: string;
  onCompleterDocuments?: (pieceCode?: string | null) => void;
}) {
  const visiblePieces = pieceRows.filter((p) => !isPiecePassportOrCni(p));
  const missingPieces = missingObligatoires.filter((p) => !isPiecePassportOrCni(p));

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
          Pièces ({visiblePieces.length - missingPieces.length}/{visiblePieces.length} — obligatoires
          manquantes : {missingPieces.length})
        </p>
        <ul className="mt-2 space-y-1.5">
          {visiblePieces.map((piece) => {
            const statut = piece.statut ?? "manquante";
            const incomplete = statut === "manquante" || statut === "a_corriger";
            return (
              <li key={piece.id} className="flex items-center gap-2 text-sm">
                {incomplete ? (
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
                {incomplete && onCompleterDocuments ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="ml-auto h-auto p-0 text-xs text-primary"
                    onClick={() => onCompleterDocuments(piece.code)}
                  >
                    Compléter
                  </Button>
                ) : (
                  <span className="ml-auto font-mono text-[10px] uppercase text-muted-foreground">
                    {statut.replace("_", " ")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {!isKycComplete && (
        <div className="flex items-start gap-3 rounded-md border border-ambre/40 bg-jaune-pale/80 p-4 text-encre">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-ambre" strokeWidth={1.5} />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-encre">Pièce d&apos;identité (KYC) requise</p>
            <p className="text-xs text-ardoise">
              Vous devez obligatoirement renseigner et téléverser votre pièce d&apos;identité (KYC) dans votre profil avant de pouvoir soumettre votre dossier.
            </p>
            <div className="pt-1">
              <Button size="sm" variant="outline" className="border-ambre/40 text-encre hover:bg-ambre/10" asChild>
                <Link href="/espace/profil?tab=kyc">Renseigner mon KYC dans mon profil &rarr;</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {missingObligatoires.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-destructive" strokeWidth={1.5} />
          <div className="flex-1 text-sm text-destructive">
            <p className="font-medium">
              {missingObligatoires.length} pièce(s) obligatoire(s) manquante(s) :
            </p>
            <ul className="mt-1 list-inside list-disc">
              {missingObligatoires.map((piece) => (
                <li key={piece.id}>
                  {piece.libelle}
                  {onCompleterDocuments && (
                    <button
                      type="button"
                      className="ml-2 underline underline-offset-2"
                      onClick={() => onCompleterDocuments(piece.code)}
                    >
                      Compléter
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {onCompleterDocuments && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => onCompleterDocuments(missingObligatoires[0]?.code)}
              >
                Aller aux documents
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
