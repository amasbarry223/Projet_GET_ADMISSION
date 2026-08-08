"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Search,
  Stamp,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  hasFile: boolean;
  nomFichier: string | null;
};

type TabKey = "a-emettre" | "emises";

function attestationViewUrl(dossierId: string) {
  return `/api/dossiers/${dossierId}/attestation/download?disposition=inline`;
}

function attestationDownloadUrl(dossierId: string) {
  return `/api/dossiers/${dossierId}/attestation/download`;
}

export function AttestationsClient({
  initialAEmettre,
  initialEmises,
}: {
  initialAEmettre: AttestationDossier[];
  initialEmises: AttestationDossier[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [aEmettre, setAEmettre] = React.useState(initialAEmettre);
  const [emises, setEmises] = React.useState(initialEmises);
  const [tab, setTab] = React.useState<TabKey>("a-emettre");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialAEmettre[0]?.id ?? initialEmises[0]?.id ?? null,
  );
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

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

  const iframeSrc = selected?.hasFile ? attestationViewUrl(selected.id) : null;

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

  const confirmUploadAttestation = async () => {
    if (!selected || !uploadFile) return;
    const dossierId = selected.id;
    const reference = selected.reference;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", uploadFile);
    const res = await fetch(`/api/dossiers/${dossierId}/attestation/upload`, {
      method: "POST",
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      toast.error("Téléversement échoué", { description: (body as { error?: string })?.error });
      return;
    }
    setUploadOpen(false);
    setUploadFile(null);
    const wasDraft = selectedIsDraft;
    toast.success(wasDraft ? "Attestation émise" : "Document remplacé", {
      description: wasDraft
        ? `${reference} — le candidat a été félicité et notifié.`
        : `${reference} — nouveau document disponible.`,
    });
    if (wasDraft) {
      setAEmettre((prev) => prev.filter((d) => d.id !== dossierId));
      setEmises((prev) => {
        const moved = aEmettre.find((d) => d.id === dossierId);
        if (!moved) return prev;
        return [{ ...moved, etat: "ATTESTATION", hasFile: true }, ...prev];
      });
      setTab("emises");
    } else {
      setEmises((prev) => prev.map((d) => (d.id === dossierId ? { ...d, hasFile: true } : d)));
    }
    setSelectedId(dossierId);
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
            : "border-transparent hover:border-ligne hover:bg-card",
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
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Atelier d&apos;émission.
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ligne bg-card px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">À émettre</p>
          <p className="mt-1 font-display text-3xl font-bold text-ambre">{aEmettre.length}</p>
        </div>
        <div className="rounded-2xl border border-ligne bg-card px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Émises</p>
          <p className="mt-1 font-display text-3xl font-bold text-vert">{emises.length}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,42%)]">
        {/* Rail gauche */}
        <div className="min-w-0 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-4">
            <TabsList className="h-auto w-full grid grid-cols-2 bg-porcelaine p-1">
              <TabsTrigger value="a-emettre" className="py-2 data-[state=active]:bg-card">
                À émettre
              </TabsTrigger>
              <TabsTrigger value="emises" className="py-2 data-[state=active]:bg-card">
                Émises
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
                  className="pl-9 bg-card"
                />
              </div>
            )}

            <TabsContent value="a-emettre" className="mt-0">
              <div className="rounded-2xl border border-ligne bg-card p-2">
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
              <div className="rounded-2xl border border-ligne bg-card p-2">
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
          </Tabs>
        </div>

        {/* Panneau aperçu */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-ligne bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne px-4 py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Aperçu</p>
                <p className="text-sm font-medium text-encre">
                  {selected
                    ? `${selected.candidatPrenom} ${selected.candidatNom}`
                    : "Aucun dossier sélectionné"}
                </p>
              </div>
              {selected?.hasFile ? (
                <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">
                  {selected.etat?.toLowerCase() === "cloture" ? "Récupérée" : "Émise"}
                </Badge>
              ) : selected ? (
                <Badge className="bg-ambre/15 font-mono text-[10px] uppercase text-ambre">
                  Document à téléverser
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
                    {...(!reduce ? { exit: { opacity: 0 } } : {})}
                    transition={{ duration: 0.25 }}
                    className="aspect-[3/4] w-full sm:aspect-[4/5]"
                  >
                    <iframe
                      title="Aperçu attestation"
                      src={iframeSrc}
                      className="h-full w-full border-0 bg-card"
                    />
                  </motion.div>
                ) : selected ? (
                  <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 px-6 text-center sm:aspect-[4/5]">
                    <Upload className="h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
                    <p className="text-sm text-ardoise">
                      Aucun document téléversé pour ce dossier. Téléversez le document envoyé par
                      l&apos;université pour l&apos;émettre auprès du candidat.
                    </p>
                  </div>
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
                {selected.hasFile && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-ligne"
                      onClick={() => window.open(attestationDownloadUrl(selected.id), "_blank")}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Télécharger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-ligne"
                      onClick={() => window.open(attestationViewUrl(selected.id), "_blank")}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Plein écran
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  className={cn(
                    "bg-lapis text-blanc hover:bg-lapis/90",
                    selected.hasFile ? "w-full sm:w-auto" : "w-full flex-1",
                  )}
                  onClick={() => {
                    setUploadFile(null);
                    setUploadOpen(true);
                  }}
                >
                  <Stamp className="mr-1.5 h-3.5 w-3.5" />
                  {selected.hasFile ? "Remplacer" : "Téléverser & émettre"}
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Dialog téléversement attestation */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selected?.hasFile ? "Remplacer le document" : "Téléverser l'attestation"}
            </DialogTitle>
            <DialogDescription>
              {selected?.hasFile
                ? "Le nouveau fichier remplacera le document actuellement visible par le candidat."
                : `Téléversez le document de préinscription envoyé par ${selected?.universiteNom ?? "l'université"}. ${selected?.candidatPrenom ?? "Le candidat"} sera notifié avec un message de félicitations.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              aria-label="Document d'attestation"
            />
            {!uploadFile && <p className="text-xs text-ardoise">PDF, JPG, PNG ou WEBP — 10 Mo max.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={!uploadFile || uploading}
              onClick={() => void confirmUploadAttestation()}
            >
              {uploading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              {selected?.hasFile ? "Remplacer" : "Envoyer au candidat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
