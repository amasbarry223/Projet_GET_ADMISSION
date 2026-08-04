"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import type { PersonalInfo } from "@/components/dossier/wizard/types";

export type InfosFieldErrors = Partial<Record<keyof PersonalInfo, string>>;

export function DossierStepInfos({
  personalInfo,
  isEditable,
  fieldErrors,
  onChange,
}: {
  personalInfo: PersonalInfo;
  isEditable: boolean;
  fieldErrors?: InfosFieldErrors;
  onChange: (next: PersonalInfo) => void;
}) {
  const patch = (partial: Partial<PersonalInfo>) => onChange({ ...personalInfo, ...partial });
  const err = fieldErrors ?? {};

  const fields: {
    key: keyof PersonalInfo;
    label: string;
    type?: string;
    colSpan?: boolean;
  }[] = [
    { key: "prenom", label: "Prénom" },
    { key: "nom", label: "Nom" },
    { key: "naissance", label: "Date de naissance", type: "date" },
    { key: "nationalite", label: "Nationalité" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "tel", label: "Téléphone", type: "tel" },
    { key: "adresse", label: "Adresse", colSpan: true },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Informations personnelles</h2>
        <p className="text-sm text-muted-foreground">
          Vos coordonnées telles qu&apos;elles figureront sur le dossier.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, type, colSpan }) => {
          const id = `infos-${key}`;
          const errorId = `${id}-error`;
          const message = err[key];
          return (
            <div key={key} className={colSpan ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                type={type}
                value={personalInfo[key]}
                onChange={(event) => patch({ [key]: event.target.value })}
                disabled={!isEditable}
                aria-invalid={!!message}
                aria-describedby={message ? errorId : undefined}
              />
              <FieldError id={errorId} message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
