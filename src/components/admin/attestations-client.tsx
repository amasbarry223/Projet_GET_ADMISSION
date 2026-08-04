"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Stamp,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { apiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AttestationDossier = {
  id: string;
  reference: string;
  etat: string;
  updatedAt: string;
  candidatPrenom: string;
  candidatNom: string;
  universiteNom: string;
  universiteEcusson: string;
  formationIntitule: string;
};

export type ModeleAttestation = {
  id: number;
  nom: string;
  description: string;
  nbUsages: number;
  actif: boolean;
  ordre: number;
};

type TabKey = "a-emettre" | "emises" | "modeles";

function previewUrl(dossierId: string, draft: boolean) {
  const q = new URLSearchParams({ format: "html" });
  if (draft) q.set("draft", "1");
  return `/api/attestation-pdf/${dossierId}?${q.toString()}`;
}

function pdfUrl(dossierId: string, draft: boolean) {
  const q = new URLSearchParams({ format: "pdf" });
  if (draft) q.set("draft", "1");
  return `/api/attestation-pdf/${dossierId}?${q.toString()}`;
}

export function AttestationsClient({
  initialAEmettre,
  initialEmises,
  initialModeles,
}: {
  initialAEmettre: AttestationDossier[];
  initialEmises: AttestationDossier[];
  initialModeles: ModeleAttestation[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [aEmettre, setAEmettre] = React.useState(initialAEmettre);
  const [emises, setEmises] = React.useState(initialEmises);
  const [modeles, setModeles] = React.useState(initialModeles);
  const [tab, setTab] = React.useState<TabKey>("a-emettre");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialAEmettre[0]?.id ?? initialEmises[0]?.id ?? null,
  );
  const [emittingId, setEmittingId] = React.useState<string | null>(null);
  const [modeleOpen, setModeleOpen] = React.useState(false);
  const [modeleNom, setModeleNom] = React.useState("");
  const [modeleDesc, setModeleDesc] = React.useState("");
  const [creatingModele, setCreatingModele] = React.useState(false);

  const [prevInitialA, setPrevInitialA] = React.useState(initialAEmettre);
  if (initialAEmettre !== prevInitialA) {
    setPrevInitialA(initialAEmettre);
    setAEmettre(initialAEmettre);
  }
  const [prevInitialE, setPrevInitialE] = React.useState(initialEmises);
  if (initialEmises !== prevInitialE) {
    setPrevInitialE(initialEmises);
    setEmises(initialEmises);
  }
  const [prevInitialM, setPrevInitialM] = React.useState(initialModeles);
  if (initialModeles !== prevInitialM) {
    setPrevInitialM(initialModeles);
    setModeles(initialModeles);
  }

  const filterList = React.useCallback(
    (list: AttestationDossier[]) => {
      const q = query.trim().toLowerCase();
      if (!q) return list;
      return list.filter((d) => {
        const hay = `${d.candidatPrenom} ${d.candidatNom} ${d.reference} ${d.universiteNom} ${d.formationIntitule}`.toLowerCase();
        return hay.includes(q);
      });
    },
    [query],
  );

  const listAEmettre = filterList(aEmettre);
  const listEmises = filterList(emises);

  const selected =
    aEmettre.find((d) => d.id === selectedId) ??
    emises.find((d) => d.id === selectedId) ??
    null;

  const selectedIsDraft =
    !!selected && (selected.etat === "PRE_ADMISSION" || aEmettre.some((d) => d.id === selected.id));

  const iframeSrc = selected
    ? previewUrl(selected.id, selectedIsDraft)
    : null;

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (tab === "a-emettre" && listAEmettre.length && !listAEmettre.some((d) => d.id === selectedId)) {
        setSelectedId(listAEmettre[0]!.id);
      }
      if (tab === "emises" && listEmises.length && !listEmises.some((d) => d.id === selectedId)) {
        setSelectedId(listEmises[0]!.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tab, listAEmettre, listEmises, selectedId]);

  const emettreAttestation = async (dossierId: string, reference: string) => {
    setEmittingId(dossierId);
    const result = await apiJson(`/api/dossiers/${dossierId}/workflow`, "POST", {
      action: "emettre_attestation",
    });
    setEmittingId(null);
    if (!result.ok) {
      toast.error("Émission échouée", { description: result.error });
      return;
    }
    toast.success("Attestation émise", {
      description: `${reference} — disponible dans l'espace candidat.`,
    });
    setAEmettre((prev) => prev.filter((d) => d.id !== dossierId));
    setEmises((prev) => {
      const moved = aEmettre.find((d) => d.id === dossierId);
      if (!moved) return prev;
      return [{ ...moved, etat: "ATTESTATION" }, ...prev];
    });
    setTab("emises");
    setSelectedId(dossierId);
    router.refresh();
  };

  const createModele = async () => {
    if (!modeleNom.trim()) {
      toast.error("Nom requis");
      return;
    }
    setCreatingModele(true);
    const result = await apiJson("/api/public/modeles-attestation", "POST", {
      nom: modeleNom.trim(),
      description: modeleDesc.trim(),
    });
    setCreatingModele(false);
    if (!result.ok) {
      toast.error("Création du modèle impossible", { description: result.error });
      return;
    }
    toast.success("Modèle créé", { description: modeleNom.trim() });
    setModeleOpen(false);
    setModeleNom("");
    setModeleDesc("");
    router.refresh();
  };

  const renderDossierRow = (d: AttestationDossier, draft: boolean) => {
    const active = selectedId === d.id;
    const ecusson = d.universiteEcusson ?? "—";
    return (
      <button
        key={d.id}
        type="button"
        onClick={() => setSelectedId(d.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
          active
            ? "border-lapis/40 bg-or-pale/50"
            : "border-transparent hover:border-ligne hover:bg-blanc",
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 flex-none items-center justify-center rounded-lg font-mono text-[10px] font-semibold",
            draft ? "bg-ambre/10 text-ambre" : "bg-vert/10 text-vert",
          )}
        >
          {draft ? (d.candidatNom ?? "").slice(0, 2).toUpperCase() : <CheckCircle2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-encre">
            {d.candidatPrenom} {d.candidatNom}
          </p>
          <p className="truncate text-xs text-ardoise">
            {d.universiteNom} · {d.formationIntitule}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-ardoise/80">
            {draft
              ? `Pré-admission · ${formatDate(d.updatedAt)}`
              : `ATT-${d.reference.slice(-6)}-${ecusson}`}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            Atelier d&apos;émission.
          </h1>
        </div>
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => setModeleOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Nouveau modèle
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ligne bg-blanc px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">À émettre</p>
          <p className="mt-1 font-display text-3xl font-bold text-ambre">{aEmettre.length}</p>
        </div>
        <div className="rounded-2xl border border-ligne bg-blanc px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Émises</p>
          <p className="mt-1 font-display text-3xl font-bold text-vert">{emises.length}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,42%)]">
        {/* Rail gauche */}
        <div className="min-w-0 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-4">
            <TabsList className="h-auto w-full grid grid-cols-3 bg-porcelaine p-1">
              <TabsTrigger value="a-emettre" className="py-2 data-[state=active]:bg-blanc">
                À émettre
              </TabsTrigger>
              <TabsTrigger value="emises" className="py-2 data-[state=active]:bg-blanc">
                Émises
              </TabsTrigger>
              <TabsTrigger value="modeles" className="py-2 data-[state=active]:bg-blanc">
                Modèles
              </TabsTrigger>
            </TabsList>

            {(tab === "a-emettre" || tab === "emises") && (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                  strokeWidth={1.5}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filtrer nom, référence, école…"
                  className="pl-9 bg-blanc"
                />
              </div>
            )}

            <TabsContent value="a-emettre" className="mt-0">
              <div className="rounded-2xl border border-ligne bg-blanc p-2">
                {listAEmettre.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-vert" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-ardoise">File d&apos;attente vide.</p>
                  </div>
                ) : (
                  <ul className="max-h-[min(60vh,520px)] space-y-0.5 overflow-y-auto scroll-fine p-1">
                    {listAEmettre.map((d) => renderDossierRow(d, true))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="emises" className="mt-0">
              <div className="rounded-2xl border border-ligne bg-blanc p-2">
                {listEmises.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <Stamp className="mx-auto h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-ardoise">Aucune attestation émise.</p>
                  </div>
                ) : (
                  <ul className="max-h-[min(60vh,520px)] space-y-0.5 overflow-y-auto scroll-fine p-1">
                    {listEmises.map((d) => renderDossierRow(d, false))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="modeles" className="mt-0">
              <div className="space-y-2">
                {modeles.length === 0 ? (
                  <div className="rounded-2xl border border-ligne bg-blanc px-4 py-12 text-center">
                    <Stamp className="mx-auto h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-ardoise">Aucun modèle actif.</p>
                  </div>
                ) : (
                  modeles.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-2xl border border-ligne bg-blanc p-4"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-or-pale text-or">
                        <Stamp className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-encre">{m.nom}</h3>
                          <Badge variant="outline" className="font-mono text-[10px] text-ardoise">
                            {m.nbUsages} usage(s)
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-ardoise">{m.description}</p>
                        <p className="mt-2 text-xs text-ardoise">
                          {selected
                            ? "L'aperçu à droite utilise ce modèle sur le dossier sélectionné."
                            : "Sélectionnez un dossier (onglet À émettre / Émises) pour prévisualiser."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panneau aperçu */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-ligne bg-blanc shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne px-4 py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Aperçu</p>
                <p className="text-sm font-medium text-encre">
                  {selected
                    ? `${selected.candidatPrenom} ${selected.candidatNom}`
                    : "Aucun dossier sélectionné"}
                </p>
              </div>
              {selectedIsDraft && selected ? (
                <Badge className="bg-ambre/15 font-mono text-[10px] uppercase text-ambre">Brouillon</Badge>
              ) : selected ? (
                <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">
                  {selected.etat?.toLowerCase() === "cloture" ? "Récupérée" : "Émise"}
                </Badge>
              ) : null}
            </div>

            <div className="relative bg-porcelaine">
              <AnimatePresence mode="wait">
                {iframeSrc ? (
                  <motion.div
                    key={iframeSrc}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="aspect-[3/4] w-full sm:aspect-[4/5]"
                  >
                    <iframe
                      title="Aperçu attestation"
                      src={iframeSrc}
                      className="h-full w-full border-0 bg-blanc"
                    />
                  </motion.div>
                ) : (
                  <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 px-6 text-center sm:aspect-[4/5]">
                    <Eye className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
                    <p className="text-sm text-ardoise">
                      Sélectionnez un dossier pour prévisualiser l&apos;attestation.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {selected && (
              <div className="flex flex-wrap gap-2 border-t border-ligne p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-ligne"
                  onClick={() => window.open(pdfUrl(selected.id, selectedIsDraft), "_blank")}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-ligne"
                  onClick={() => window.open(previewUrl(selected.id, selectedIsDraft), "_blank")}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Plein écran
                </Button>
                {selectedIsDraft && (
                  <Button
                    size="sm"
                    className="w-full bg-lapis text-blanc hover:bg-lapis/90 sm:w-auto sm:flex-1"
                    disabled={emittingId === selected.id}
                    onClick={() => emettreAttestation(selected.id, selected.reference)}
                  >
                    {emittingId === selected.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Stamp className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Émettre
                  </Button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Dialog nouveau modèle */}
      <Dialog open={modeleOpen} onOpenChange={setModeleOpen}>
        <DialogContent className="bg-blanc sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nouveau modèle</DialogTitle>
            <DialogDescription>
              Le modèle actif sert de base à l&apos;aperçu et aux PDF générés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="modele-nom">Nom</Label>
              <Input
                id="modele-nom"
                value={modeleNom}
                onChange={(e) => setModeleNom(e.target.value)}
                placeholder="Attestation de pré-inscription"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modele-desc">Description</Label>
              <textarea
                id="modele-desc"
                value={modeleDesc}
                onChange={(e) => setModeleDesc(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-ligne bg-blanc px-3 py-2 text-sm"
                placeholder="Document officiel GET Admission…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeleOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              onClick={createModele}
              disabled={creatingModele}
            >
              {creatingModele && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
