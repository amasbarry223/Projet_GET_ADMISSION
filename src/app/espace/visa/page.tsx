"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Upload,
  FileCheck,
  Eye,
  Loader2,
  AlertTriangle,
  FileText,
} from "lucide-react";

type DemandeVisaState = {
  id: string;
  statut: "ACCORDE" | "REFUSE";
  fichierVisaUrl?: string | null;
  motifRefus?: string | null;
  updatedAt: string;
} | null;

export default function CandidateVisaPage() {
  const [visa, setVisa] = React.useState<DemandeVisaState>(null);
  const [loading, setLoading] = React.useState(true);
  const [mode, setMode] = React.useState<"ACCORDE" | "REFUSE">("ACCORDE");
  const [motifRefus, setMotifRefus] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const loadVisa = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/visa");
      if (res.ok) {
        const data = await res.json();
        setVisa(data.visa ?? null);
        if (data.visa) {
          setMode(data.visa.statut);
          if (data.visa.motifRefus) setMotifRefus(data.visa.motifRefus);
        }
      }
    } catch {
      toast.error("Erreur de chargement du statut de votre visa");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => void loadVisa());
  }, [loadVisa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "ACCORDE" && !file && !visa?.fichierVisaUrl) {
      toast.error("Veuillez choisir le fichier scanné de votre visa");
      return;
    }

    if (mode === "REFUSE" && !motifRefus.trim()) {
      toast.error("Veuillez saisir le motif explicite du refus de visa");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("statut", mode);
      if (mode === "REFUSE") {
        fd.append("motifRefus", motifRefus.trim());
      }
      if (mode === "ACCORDE" && file) {
        fd.append("fichier", file);
      }

      const res = await fetch("/api/visa", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error("Échec de l'enregistrement", {
          description: data.error || "Une erreur est survenue.",
        });
        return;
      }

      toast.success(
        mode === "ACCORDE"
          ? "Scan du visa transmis avec succès !"
          : "Déclaration de refus enregistrée.",
      );
      setVisa(data.visa);
      setEditing(false);
    } catch {
      toast.error("Erreur lors de la soumission de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-lapis" />
          <p className="mt-4 text-sm text-ardoise">Chargement de votre espace Visa...</p>
        </div>
      </div>
    );
  }

  const showForm = !visa || editing;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* En-tête de la page */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lapis">
          <FileCheck className="h-4 w-4" /> Espace Candidat · Suivi Consulaire
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-encre sm:text-3xl font-display">
          Déclaration et document de Visa
        </h1>
        <p className="mt-2 text-sm text-ardoise">
          Informez l&apos;administration de l&apos;issue de votre demande de visa pour l&apos;étranger.
          Transmettez votre visa scanné s&apos;il est accordé, ou déclarez le motif en cas de refus.
        </p>
      </div>

      {/* Affichage si déjà soumis et pas en cours d'édition */}
      {!showForm && visa && (
        <div className="space-y-6">
          <Card className="p-6 border-ligne bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ligne pb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    visa.statut === "ACCORDE"
                      ? "bg-vert/10 text-vert"
                      : "bg-carmin/10 text-carmin"
                  }`}
                >
                  {visa.statut === "ACCORDE" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-encre">
                      Statut déclaré :{" "}
                      {visa.statut === "ACCORDE" ? "Visa Accordé / Obtenu" : "Visa Refusé"}
                    </h2>
                    <Badge
                      className={`font-mono text-[10px] uppercase ${
                        visa.statut === "ACCORDE"
                          ? "bg-vert/10 text-vert border-vert/20"
                          : "bg-carmin/10 text-carmin border-carmin/20"
                      }`}
                    >
                      {visa.statut === "ACCORDE" ? "Accordé" : "Refusé"}
                    </Badge>
                  </div>
                  <p className="text-xs text-ardoise mt-0.5">
                    Dernière mise à jour le{" "}
                    {new Date(visa.updatedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-medium"
                onClick={() => setEditing(true)}
              >
                Modifier ma déclaration
              </Button>
            </div>

            {/* Contenu détaillé selon le statut */}
            <div className="mt-6">
              {visa.statut === "ACCORDE" ? (
                <div className="rounded-xl border border-vert/20 bg-vert/5 p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-vert shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-encre">Scan du Visa officiel</p>
                        <p className="text-xs text-ardoise">
                          Votre visa a été transmis et transmis à l&apos;équipe pédagogique et consulaire.
                        </p>
                      </div>
                    </div>
                    {visa.fichierVisaUrl && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 px-4 bg-vert text-blanc hover:bg-vert/90 gap-2 shrink-0"
                        onClick={() => window.open("/api/visa/file?disposition=inline", "_blank")}
                      >
                        <Eye className="h-4 w-4" /> Aperçu / Consulter le document
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-carmin/20 bg-carmin/5 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-carmin shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-encre">Motif du refus consulaire :</p>
                      <p className="mt-2 text-sm text-carmin/90 font-mono bg-card/80 p-3 rounded-lg border border-carmin/20 whitespace-pre-wrap">
                        {visa.motifRefus || "Aucun motif précisé"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Formulaire de soumission ou modification */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 border-ligne bg-card shadow-sm">
            <h2 className="text-lg font-bold text-encre">Sélectionnez le statut de votre Visa</h2>
            <p className="text-xs text-ardoise mt-1">
              Indiquez la décision consulaire rendue suite à votre rendez-vous de visa.
            </p>

            {/* Choix du mode */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                className={`flex flex-col items-start p-5 rounded-xl border-2 transition-all text-left ${
                  mode === "ACCORDE"
                    ? "border-vert bg-vert/5 shadow-xs"
                    : "border-ligne bg-card hover:border-vert/40"
                }`}
                onClick={() => setMode("ACCORDE")}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-vert/10 text-vert">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <input
                    type="radio"
                    checked={mode === "ACCORDE"}
                    onChange={() => setMode("ACCORDE")}
                    className="h-4 w-4 text-vert focus:ring-vert"
                  />
                </div>
                <p className="mt-3 text-base font-bold text-encre">Visa Accordé / Obtenu</p>
                <p className="mt-1 text-xs text-ardoise">
                  J&apos;ai reçu mon passeport avec le visa de séjour apposé.
                </p>
              </button>

              <button
                type="button"
                className={`flex flex-col items-start p-5 rounded-xl border-2 transition-all text-left ${
                  mode === "REFUSE"
                    ? "border-carmin bg-carmin/5 shadow-xs"
                    : "border-ligne bg-card hover:border-carmin/40"
                }`}
                onClick={() => setMode("REFUSE")}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-carmin/10 text-carmin">
                    <XCircle className="h-5 w-5" />
                  </span>
                  <input
                    type="radio"
                    checked={mode === "REFUSE"}
                    onChange={() => setMode("REFUSE")}
                    className="h-4 w-4 text-carmin focus:ring-carmin"
                  />
                </div>
                <p className="mt-3 text-base font-bold text-encre">Visa Refusé</p>
                <p className="mt-1 text-xs text-ardoise">
                  Un refus de visa m&apos;a été notifié par le consulat.
                </p>
              </button>
            </div>

            {/* Formulaire Visa ACCORDÉ */}
            {mode === "ACCORDE" && (
              <div className="mt-6 pt-6 border-t border-ligne space-y-4">
                <Label className="text-sm font-semibold text-encre">
                  Téléverser le scan du Visa (Page passeport avec le timbre/vignette)
                </Label>
                <p className="text-xs text-ardoise">
                  Formats acceptés : PDF, PNG, JPG, WEBP (Taille maximale 10 Mo).
                </p>

                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-ligne bg-porcelaine/30 p-8 text-center hover:border-lapis/50">
                  <Upload className="h-8 w-8 text-lapis" strokeWidth={1.5} />
                  <p className="mt-3 text-xs font-semibold text-encre">
                    {file ? file.name : "Cliquez ou glissez votre fichier ici"}
                  </p>
                  {file && (
                    <p className="mt-1 text-[11px] text-ardoise">
                      {(file.size / (1024 * 1024)).toFixed(2)} Mo
                    </p>
                  )}
                  <label className="mt-4 cursor-pointer">
                    <span className="inline-flex h-9 items-center justify-center rounded-lg bg-card px-4 text-xs font-semibold text-encre border border-ligne shadow-xs hover:bg-porcelaine">
                      {file ? "Changer de fichier" : "Sélectionner le document"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Formulaire Visa REFUSÉ */}
            {mode === "REFUSE" && (
              <div className="mt-6 pt-6 border-t border-ligne space-y-4">
                <Label htmlFor="motif-refus" className="text-sm font-semibold text-encre">
                  Motif du refus de visa <span className="text-carmin">*</span>
                </Label>
                <p className="text-xs text-ardoise">
                  Indiquez précisément le ou les motifs mentionnés sur la lettre de refus consulaire
                  (ex. Motif 4 : Ressources financières insuffisantes, Motif 2 : Objet du séjour non fiable...).
                </p>

                <Textarea
                  id="motif-refus"
                  rows={4}
                  placeholder="Renseignez le motif exact fourni par le consulat..."
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  className="font-sans text-sm border-ligne"
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-ligne">
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={submitting}
                >
                  Annuler
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                className="h-10 px-6 font-semibold bg-lapis text-blanc hover:bg-lapis/90 gap-2"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Enregistrement..." : "Valider et transmettre mon statut"}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
