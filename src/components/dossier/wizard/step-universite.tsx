"use client";

import { Building2, Landmark } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/dossier/wizard/upload-zone";
import type { Formation, TypeProcedure, Universite } from "@/components/dossier/wizard/types";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

const PROCEDURE_OPTIONS: {
  value: TypeProcedure;
  icon: typeof Building2;
  title: string;
  description: string;
}[] = [
  {
    value: "PRIVEE",
    icon: Building2,
    title: "Université Privée",
    description: "Je sélectionne moi-même mon établissement.",
  },
  {
    value: "PUBLIQUE",
    icon: Landmark,
    title: "Université Publique",
    description: "L'agence étudiera mon profil et choisira les établissements adaptés.",
  },
];

export function DossierStepUniversite({
  procedure,
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
  onProcedureChange,
  onUniversiteChange,
  onFormationChange,
}: {
  procedure: TypeProcedure;
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
  onProcedureChange: (procedure: TypeProcedure) => void;
  onUniversiteChange: (universiteId: string) => void;
  onFormationChange: (formationId: string) => void;
}) {
  const universitesReelles = universites.filter((u) => !u.estPlaceholder);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Procédure d'admission</h2>
        <p className="text-sm text-muted-foreground">Choisissez votre procédure d'admission.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PROCEDURE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = procedure === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={!isEditable || hasExistingDossier}
              onClick={() => onProcedureChange(option.value)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-md border-2 p-4 text-left transition-all",
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                (!isEditable || hasExistingDossier) && "cursor-not-allowed opacity-70",
              )}
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {procedure === "PUBLIQUE" ? (
        <div className="rounded-md border border-primary/25 bg-primary/5 p-4 text-sm text-foreground">
          Pour les universités publiques, le choix de l'établissement est réalisé par notre équipe
          afin d'optimiser vos chances d'admission selon votre profil académique. Complétez
          simplement votre dossier académique et vos documents ci-après — nous vous tiendrons
          informé dès qu'un établissement vous sera affecté.
        </div>
      ) : (
        <>
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
                  {universitesReelles.map((universite) => (
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
        </>
      )}
    </div>
  );
}
