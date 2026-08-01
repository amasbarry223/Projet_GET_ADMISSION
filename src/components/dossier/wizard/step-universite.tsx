"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/dossier/wizard/upload-zone";
import type { Formation, Universite } from "@/components/dossier/wizard/types";
import { formatFCFA } from "@/lib/format";

export function DossierStepUniversite({
  universites,
  universiteId,
  formationId,
  formationsForUniv,
  formation,
  typeEtab,
  fraisAgenceAffiche,
  prerequisList,
  isEditable,
  hasExistingDossier,
  onUniversiteChange,
  onFormationChange,
}: {
  universites: Universite[];
  universiteId: string;
  formationId: string;
  formationsForUniv: Formation[];
  formation: Formation | undefined;
  typeEtab: string;
  fraisAgenceAffiche: number;
  prerequisList: string[];
  isEditable: boolean;
  hasExistingDossier: boolean;
  onUniversiteChange: (universiteId: string) => void;
  onFormationChange: (formationId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Université & formation</h2>
        <p className="text-sm text-muted-foreground">Choisissez votre destination et votre cursus.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Université partenaire</Label>
          <Select
            value={universiteId}
            disabled={!isEditable || hasExistingDossier}
            onValueChange={onUniversiteChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une université" />
            </SelectTrigger>
            <SelectContent>
              {universites.map((universite) => (
                <SelectItem key={universite.id} value={universite.id}>
                  {universite.drapeau} {universite.nom} — {universite.ville} (
                  {universite.typeEtablissement === "PUBLIC" ? "Public" : "Privé"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Formation</Label>
          <Select
            value={formationId}
            onValueChange={onFormationChange}
            disabled={!isEditable || hasExistingDossier}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une formation" />
            </SelectTrigger>
            <SelectContent>
              {formationsForUniv.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.intitule} ({item.niveau})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {formation && (
        <div className="rounded-md border border-border bg-muted p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Niveau" value={formation.niveau} />
            <Field label="Domaine" value={formation.domaine} />
            <Field label="Type" value={typeEtab === "PUBLIC" ? "Public" : "Privé"} />
            <Field label="Frais d'agence" value={formatFCFA(fraisAgenceAffiche)} mono />
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
              Prérequis
            </p>
            <p className="mt-1 text-sm text-foreground">
              {prerequisList.length > 0 ? prerequisList.join(" · ") : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
