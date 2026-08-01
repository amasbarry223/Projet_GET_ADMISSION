"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

export type RedoublementForm = { niveau: string; anneeScolaire: string };
export type InterruptionForm = {
  type: "stage" | "emploi" | "formation" | "volontariat" | "lettre" | "autre";
  anneeDebut: string;
  anneeFin: string;
  libelle?: string;
};

export type ProfilAcademiqueFormState = {
  statutCandidat: "LYCEEN" | "BACHELIER";
  classeActuelle: string;
  aObtenuBac: boolean;
  trimestresSeconde: number;
  trimestresPremiere: number;
  trimestresTerminale: number;
  attestationScolariteDisponible: boolean;
  niveauEtudesSuperieures: "AUCUN" | "L1" | "L2" | "L3" | "DUT_BTS" | "MASTER_PLUS";
  formationEnCours: boolean;
  diplomesObtenus: string[];
  redoublements: RedoublementForm[];
  interruptions: InterruptionForm[];
};

export const emptyProfilAcademique = (): ProfilAcademiqueFormState => ({
  statutCandidat: "LYCEEN",
  classeActuelle: "TERMINALE",
  aObtenuBac: false,
  trimestresSeconde: 3,
  trimestresPremiere: 3,
  trimestresTerminale: 2,
  attestationScolariteDisponible: false,
  niveauEtudesSuperieures: "AUCUN",
  formationEnCours: false,
  diplomesObtenus: [],
  redoublements: [],
  interruptions: [],
});

export function profilFromApi(data: Partial<ProfilAcademiqueFormState> | null | undefined): ProfilAcademiqueFormState {
  const base = emptyProfilAcademique();
  if (!data) return base;
  return {
    ...base,
    statutCandidat: data.statutCandidat ?? base.statutCandidat,
    classeActuelle: data.classeActuelle ?? base.classeActuelle,
    aObtenuBac: data.aObtenuBac ?? base.aObtenuBac,
    trimestresSeconde: data.trimestresSeconde ?? base.trimestresSeconde,
    trimestresPremiere: data.trimestresPremiere ?? base.trimestresPremiere,
    trimestresTerminale: data.trimestresTerminale ?? base.trimestresTerminale,
    attestationScolariteDisponible:
      data.attestationScolariteDisponible ?? base.attestationScolariteDisponible,
    niveauEtudesSuperieures: data.niveauEtudesSuperieures ?? base.niveauEtudesSuperieures,
    formationEnCours: data.formationEnCours ?? base.formationEnCours,
    diplomesObtenus: Array.isArray(data.diplomesObtenus) ? data.diplomesObtenus : [],
    redoublements: Array.isArray(data.redoublements) ? data.redoublements : [],
    interruptions: Array.isArray(data.interruptions) ? data.interruptions : [],
  };
}

type Props = {
  value: ProfilAcademiqueFormState;
  onChange: (next: ProfilAcademiqueFormState) => void;
  onSave?: () => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
  showSaveButton?: boolean;
};

export function ProfilAcademiqueForm({
  value,
  onChange,
  onSave,
  saving,
  disabled,
  showSaveButton = true,
}: Props) {
  const [diplomeDraft, setDiplomeDraft] = React.useState("");

  const set = <K extends keyof ProfilAcademiqueFormState>(key: K, v: ProfilAcademiqueFormState[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Statut académique</Label>
        <Select
          value={value.statutCandidat}
          disabled={disabled}
          onValueChange={(v) => set("statutCandidat", v as "LYCEEN" | "BACHELIER")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LYCEEN">Lycéen (Terminale, bac non obtenu ou en cours)</SelectItem>
            <SelectItem value="BACHELIER">Bachelier (études après le bac)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.statutCandidat === "LYCEEN" ? (
        <div className="space-y-4 rounded-md border border-border bg-muted/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Parcours lycée</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <TrimestreSelect
              label="Trimestres Seconde"
              value={value.trimestresSeconde}
              disabled={disabled}
              onChange={(n) => set("trimestresSeconde", n)}
            />
            <TrimestreSelect
              label="Trimestres Première"
              value={value.trimestresPremiere}
              disabled={disabled}
              onChange={(n) => set("trimestresPremiere", n)}
            />
            <TrimestreSelect
              label="Trimestres Terminale disponibles"
              value={value.trimestresTerminale}
              disabled={disabled}
              onChange={(n) => set("trimestresTerminale", n)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={value.aObtenuBac}
              disabled={disabled}
              onChange={(e) => set("aObtenuBac", e.target.checked)}
            />
            J&apos;ai déjà obtenu mon baccalauréat
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={value.attestationScolariteDisponible}
              disabled={disabled}
              onChange={(e) => set("attestationScolariteDisponible", e.target.checked)}
            />
            J&apos;ai une attestation de scolarité disponible
          </label>
        </div>
      ) : (
        <div className="space-y-4 rounded-md border border-border bg-muted/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Études après le bac</p>
          <div className="space-y-1.5">
            <Label>Niveau d&apos;études atteint</Label>
            <Select
              value={value.niveauEtudesSuperieures}
              disabled={disabled}
              onValueChange={(v) =>
                set("niveauEtudesSuperieures", v as ProfilAcademiqueFormState["niveauEtudesSuperieures"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCUN">Bac uniquement (pas encore d&apos;études sup.)</SelectItem>
                <SelectItem value="L1">1ʳᵉ année universitaire (L1)</SelectItem>
                <SelectItem value="L2">2ᵉ année universitaire (L2)</SelectItem>
                <SelectItem value="L3">3ᵉ année / Licence 3</SelectItem>
                <SelectItem value="DUT_BTS">DUT / BTS</SelectItem>
                <SelectItem value="MASTER_PLUS">Master ou plus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={value.formationEnCours}
              disabled={disabled}
              onChange={(e) => set("formationEnCours", e.target.checked)}
            />
            Formation actuellement en cours
          </label>
          <div className="space-y-2">
            <Label>Diplômes obtenus (DUT, BTS, Licence…)</Label>
            <div className="flex flex-wrap gap-2">
              {value.diplomesObtenus.map((d) => (
                <Badge key={d} variant="outline" className="gap-1">
                  {d}
                  {!disabled && (
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        set(
                          "diplomesObtenus",
                          value.diplomesObtenus.filter((x) => x !== d)
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            {!disabled && (
              <div className="flex gap-2">
                <Input
                  placeholder="Ex. Licence"
                  value={diplomeDraft}
                  onChange={(e) => setDiplomeDraft(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const t = diplomeDraft.trim();
                    if (!t) return;
                    if (!value.diplomesObtenus.includes(t)) {
                      set("diplomesObtenus", [...value.diplomesObtenus, t]);
                    }
                    setDiplomeDraft("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Redoublements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Redoublements</p>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("redoublements", [
                  ...value.redoublements,
                  { niveau: "SECONDE", anneeScolaire: "" },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
            </Button>
          )}
        </div>
        {value.redoublements.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucun redoublement déclaré.</p>
        )}
        {value.redoublements.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select
              value={r.niveau}
              disabled={disabled}
              onValueChange={(v) => {
                const next = [...value.redoublements];
                next[i] = { ...next[i], niveau: v };
                set("redoublements", next);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["SECONDE", "PREMIERE", "TERMINALE", "L1", "L2", "L3", "DUT_BTS", "MASTER"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Année scolaire (ex. 2023-2024)"
              value={r.anneeScolaire}
              disabled={disabled}
              onChange={(e) => {
                const next = [...value.redoublements];
                next[i] = { ...next[i], anneeScolaire: e.target.value };
                set("redoublements", next);
              }}
            />
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  set(
                    "redoublements",
                    value.redoublements.filter((_, j) => j !== i)
                  )
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Interruptions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Interruptions / stages / emploi
          </p>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("interruptions", [
                  ...value.interruptions,
                  { type: "stage", anneeDebut: "", anneeFin: "" },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
            </Button>
          )}
        </div>
        {value.interruptions.length === 0 && (
          <p className="text-xs text-muted-foreground">Aucune interruption déclarée.</p>
        )}
        {value.interruptions.map((it, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
            <Select
              value={it.type}
              disabled={disabled}
              onValueChange={(v) => {
                const next = [...value.interruptions];
                next[i] = { ...next[i], type: v as InterruptionForm["type"] };
                set("interruptions", next);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stage">Stage</SelectItem>
                <SelectItem value="emploi">Emploi</SelectItem>
                <SelectItem value="formation">Formation</SelectItem>
                <SelectItem value="volontariat">Volontariat</SelectItem>
                <SelectItem value="lettre">Lettre explicative</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Libellé (optionnel)"
              value={it.libelle ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const next = [...value.interruptions];
                next[i] = { ...next[i], libelle: e.target.value };
                set("interruptions", next);
              }}
            />
            <Input
              placeholder="Début (ex. 2022)"
              value={it.anneeDebut}
              disabled={disabled}
              onChange={(e) => {
                const next = [...value.interruptions];
                next[i] = { ...next[i], anneeDebut: e.target.value };
                set("interruptions", next);
              }}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Fin (ex. 2023)"
                value={it.anneeFin}
                disabled={disabled}
                onChange={(e) => {
                  const next = [...value.interruptions];
                  next[i] = { ...next[i], anneeFin: e.target.value };
                  set("interruptions", next);
                }}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set(
                      "interruptions",
                      value.interruptions.filter((_, j) => j !== i)
                    )
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showSaveButton && onSave && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => onSave()} disabled={disabled || saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Enregistrer le parcours
          </Button>
        </div>
      )}
    </div>
  );
}

function TrimestreSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={String(value)}
        disabled={disabled}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2">2 trimestres</SelectItem>
          <SelectItem value="3">3 trimestres</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
