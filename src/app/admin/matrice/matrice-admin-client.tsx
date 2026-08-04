"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Save, CheckCircle2, Copy, Trash2 } from "lucide-react";
import { buildPiecesFromRegles } from "@/lib/dossier/matrice-engine";
import type { ProfilAcademiqueInput } from "@/lib/dossier/pieces-requises";
import { apiFetch, apiJson } from "@/lib/api-client";

type VersionRow = {
  id: string;
  numero: number;
  libelle: string;
  statut: "BROUILLON" | "ACTIVE" | "ARCHIVEE";
  notes: string;
  activatedAt: string | null;
  _count: { regles: number };
};

type Regle = {
  id?: string;
  code: string;
  libelle: string;
  categorie: string;
  obligatoire: boolean;
  condition: string;
  niveauMin?: string | null;
  meta?: string;
  ordre: number;
};

const CONDITIONS = [
  "TOUJOURS",
  "LYCEEN",
  "BACHELIER",
  "BAC_OBTENU",
  "BAC_OPTIONNEL_LYCEEN",
  "NIVEAU_SUP_MIN",
  "FORMATION_EN_COURS",
  "ATTESTATION_SCOLARITE",
  "REDOUBLEMENT",
  "INTERRUPTION",
  "IDENTITE",
  "BULLETINS_LYCEE",
];

export function MatriceAdminClient() {
  const [versions, setVersions] = React.useState<VersionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [regles, setRegles] = React.useState<Regle[]>([]);
  const [libelle, setLibelle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [statut, setStatut] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<string[]>([]);

  const loadVersions = React.useCallback(async () => {
    const result = await apiFetch<VersionRow[]>("/api/admin/matrice");
    if (!result.ok) throw new Error(result.error);
    setVersions(result.data);
    return result.data;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      loadVersions()
        .then((data) => {
          if (cancelled) return;
          const active = data.find((v) => v.statut === "ACTIVE") ?? data[0];
          if (active) setSelectedId(active.id);
        })
        .catch((e) => {
          if (!cancelled) toast.error(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [loadVersions]);

  React.useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void apiFetch<{ libelle: string; notes: string; statut: string; regles: Regle[] }>(
      `/api/admin/matrice/${selectedId}`,
    ).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error("Détail matrice impossible", { description: result.error });
        return;
      }
      setLibelle(result.data.libelle);
      setNotes(result.data.notes || "");
      setStatut(result.data.statut);
      setRegles(result.data.regles || []);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    const result = await apiJson<{ regles: Regle[] }>(`/api/admin/matrice/${selectedId}`, "PUT", {
      libelle,
      notes,
      regles,
    });
    if (!result.ok) {
      toast.error("Action impossible", { description: result.error });
      setSaving(false);
      return;
    }
    setRegles(result.data.regles || []);
    try {
      await loadVersions();
      toast.success("Matrice enregistrée");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!selectedId) return;
    setSaving(true);
    const result = await apiJson<{ numero: number }>(`/api/admin/matrice/${selectedId}/activer`, "POST");
    if (!result.ok) {
      toast.error("Action impossible", { description: result.error });
      setSaving(false);
      return;
    }
    setStatut("ACTIVE");
    try {
      await loadVersions();
      toast.success(`Matrice v${result.data.numero} activée`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const createDraft = async () => {
    setSaving(true);
    const result = selectedId
      ? await apiJson<{ id: string; numero: number }>(`/api/admin/matrice/${selectedId}/dupliquer`, "POST")
      : await apiJson<{ id: string; numero: number }>("/api/admin/matrice", "POST", { fromActive: true });
    if (!result.ok) {
      toast.error("Action impossible", { description: result.error });
      setSaving(false);
      return;
    }
    try {
      await loadVersions();
      setSelectedId(result.data.id);
      toast.success(`Brouillon v${result.data.numero} créé`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!selectedId || statut !== "BROUILLON") return;
    setSaving(true);
    const result = await apiJson(`/api/admin/matrice/${selectedId}`, "DELETE");
    if (!result.ok) {
      toast.error("Action impossible", { description: result.error });
      setSaving(false);
      return;
    }
    try {
      toast.success("Brouillon supprimé");
      const remaining = await loadVersions();
      const next =
        remaining.find((v) => v.statut === "ACTIVE") ?? remaining[0] ?? null;
      setSelectedId(next?.id ?? null);
      if (!next) {
        setLibelle("");
        setNotes("");
        setStatut("");
        setRegles([]);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const simulate = () => {
    const profil: ProfilAcademiqueInput = {
      statutCandidat: "LYCEEN",
      classeActuelle: "TERMINALE",
      aObtenuBac: false,
      trimestresSeconde: 3,
      trimestresPremiere: 3,
      trimestresTerminale: 2,
      redoublements: [{ niveau: "PREMIERE", anneeScolaire: "2023-2024" }],
    };
    const pieces = buildPiecesFromRegles(profil, regles);
    setPreview(pieces.map((p) => `${p.code} — ${p.libelle}${p.obligatoire ? "" : " (opt.)"}`));
  };

  const updateRegle = (index: number, patch: Partial<Regle>) => {
    setRegles((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRegle = () => {
    setRegles((prev) => [
      ...prev,
      {
        code: `REGLE_${prev.length + 1}`,
        libelle: "Nouvelle pièce",
        categorie: "academique",
        obligatoire: true,
        condition: "TOUJOURS",
        meta: "{}",
        ordre: (prev[prev.length - 1]?.ordre ?? 0) + 10,
      },
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ardoise">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Matrice documentaire.
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            Paramétrez les pièces selon le profil académique. Une seule version ACTIVE à la fois.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={createDraft} disabled={saving}>
            <Copy className="mr-1 h-4 w-4" /> Nouveau brouillon
          </Button>
          <Button variant="outline" onClick={simulate}>
            Simuler lycéen
          </Button>
          {statut === "BROUILLON" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-carmin/40 text-carmin hover:bg-carmin/5"
                  disabled={saving}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-blanc">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">
                    Supprimer ce brouillon ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Le brouillon «{" "}
                    {libelle || `v${versions.find((v) => v.id === selectedId)?.numero ?? ""}`} »
                    sera supprimé définitivement. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-carmin text-blanc hover:bg-carmin/90"
                    onClick={() => void deleteDraft()}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {statut !== "ACTIVE" && statut !== "ARCHIVEE" && (
            <Button onClick={activate} disabled={saving}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Activer
            </Button>
          )}
          {statut !== "ARCHIVEE" && (
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2 rounded-2xl border border-ligne bg-blanc p-3 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Versions</p>
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedId === v.id ? "bg-lapis/10 text-lapis" : "text-encre hover:bg-porcelaine"
              }`}
            >
              <span className="font-medium">v{v.numero} — {v.libelle}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-ardoise">
                <Badge variant="outline" className="font-mono text-[9px]">
                  {v.statut}
                </Badge>
                {v._count.regles} règles
              </span>
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Libellé</Label>
              <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} disabled={statut === "ARCHIVEE"} />
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Input value={statut} disabled />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={statut === "ARCHIVEE"} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Règles ({regles.length})</p>
            {statut !== "ARCHIVEE" && (
              <Button type="button" size="sm" variant="outline" onClick={addRegle}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Règle
              </Button>
            )}
          </div>

          <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {regles.map((r, i) => (
              <div key={`${r.code}-${i}`} className="grid gap-2 rounded-xl border border-ligne bg-blanc p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Code</Label>
                  <Input value={r.code} onChange={(e) => updateRegle(i, { code: e.target.value })} disabled={statut === "ARCHIVEE"} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Libellé</Label>
                  <Input value={r.libelle} onChange={(e) => updateRegle(i, { libelle: e.target.value })} disabled={statut === "ARCHIVEE"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Condition</Label>
                  <Select
                    value={r.condition}
                    onValueChange={(v) => updateRegle(i, { condition: v })}
                    disabled={statut === "ARCHIVEE"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Catégorie</Label>
                  <Input value={r.categorie} onChange={(e) => updateRegle(i, { categorie: e.target.value })} disabled={statut === "ARCHIVEE"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Niveau min</Label>
                  <Input
                    value={r.niveauMin ?? ""}
                    placeholder="L1…"
                    onChange={(e) => updateRegle(i, { niveauMin: e.target.value || null })}
                    disabled={statut === "ARCHIVEE"}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ordre</Label>
                  <Input
                    type="number"
                    value={r.ordre}
                    onChange={(e) => updateRegle(i, { ordre: Number(e.target.value) || 0 })}
                    disabled={statut === "ARCHIVEE"}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.obligatoire}
                      onChange={(e) => updateRegle(i, { obligatoire: e.target.checked })}
                      disabled={statut === "ARCHIVEE"}
                    />
                    Obligatoire
                  </label>
                  {statut !== "ARCHIVEE" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-carmin hover:bg-carmin/5 hover:text-carmin"
                      onClick={() => setRegles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {preview.length > 0 && (
            <div className="rounded-xl border border-ligne bg-porcelaine/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                Aperçu simulation ({preview.length} pièces)
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
                {preview.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
