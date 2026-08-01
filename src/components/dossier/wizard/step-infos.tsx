"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonalInfo } from "@/components/dossier/wizard/types";

export function DossierStepInfos({
  personalInfo,
  isEditable,
  onChange,
}: {
  personalInfo: PersonalInfo;
  isEditable: boolean;
  onChange: (next: PersonalInfo) => void;
}) {
  const patch = (partial: Partial<PersonalInfo>) => onChange({ ...personalInfo, ...partial });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Informations personnelles</h2>
        <p className="text-sm text-muted-foreground">
          Vos coordonnées telles qu&apos;elles figureront sur le dossier.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Prénom</Label>
          <Input
            value={personalInfo.prenom}
            onChange={(event) => patch({ prenom: event.target.value })}
            disabled={!isEditable}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input
            value={personalInfo.nom}
            onChange={(event) => patch({ nom: event.target.value })}
            disabled={!isEditable}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date de naissance</Label>
          <Input
            type="date"
            value={personalInfo.naissance}
            onChange={(event) => patch({ naissance: event.target.value })}
            disabled={!isEditable}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nationalité</Label>
          <Input
            value={personalInfo.nationalite}
            onChange={(event) => patch({ nationalite: event.target.value })}
            disabled={!isEditable}
          />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={personalInfo.email}
            onChange={(event) => patch({ email: event.target.value })}
            disabled={!isEditable}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input
            value={personalInfo.tel}
            onChange={(event) => patch({ tel: event.target.value })}
            disabled={!isEditable}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Adresse</Label>
          <Input
            value={personalInfo.adresse}
            onChange={(event) => patch({ adresse: event.target.value })}
            disabled={!isEditable}
          />
        </div>
      </div>
    </div>
  );
}
