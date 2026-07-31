"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { normalizeUniversite } from "@/lib/types";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export type UniversiteNormalized = ReturnType<typeof normalizeUniversite>;

function MediaPreview({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const trimmed = src.trim();
  if (!trimmed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-porcelaine text-xs text-ardoise",
          className,
        )}
      >
        Aperçu indisponible
      </div>
    );
  }
  const isLocal = trimmed.startsWith("/");
  if (isLocal) {
    return (
      <div className={cn("relative overflow-hidden bg-porcelaine", className)}>
        <Image src={trimmed} alt={alt} fill className="object-cover" sizes="400px" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={trimmed} alt={alt} className={cn("object-cover", className)} />
  );
}

export function CatalogueDetailClient({ universite }: { universite: UniversiteNormalized }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [description, setDescription] = React.useState(universite.description ?? "");
  const [ville, setVille] = React.useState(universite.ville ?? "");
  const [pays, setPays] = React.useState(universite.pays ?? "");
  const [fraisMin, setFraisMin] = React.useState(String(universite.fraisMin ?? 0));
  const [fraisMax, setFraisMax] = React.useState(String(universite.fraisMax ?? 0));
  const [siteUrl, setSiteUrl] = React.useState(universite.siteUrl ?? "");
  const [coverUrl, setCoverUrl] = React.useState(universite.coverUrl ?? "");
  const [logoUrl, setLogoUrl] = React.useState(universite.logoUrl ?? "");
  const [gallery, setGallery] = React.useState((universite.galleryUrls ?? []).join("\n"));

  React.useEffect(() => {
    setDescription(universite.description ?? "");
    setVille(universite.ville ?? "");
    setPays(universite.pays ?? "");
    setFraisMin(String(universite.fraisMin ?? 0));
    setFraisMax(String(universite.fraisMax ?? 0));
    setSiteUrl(universite.siteUrl ?? "");
    setCoverUrl(universite.coverUrl ?? "");
    setLogoUrl(universite.logoUrl ?? "");
    setGallery((universite.galleryUrls ?? []).join("\n"));
  }, [universite]);

  const galleryList = gallery
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/universites/${universite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: universite.nom,
          pays: pays.trim() || universite.pays,
          drapeau: universite.drapeau ?? "",
          ville: ville.trim() || universite.ville,
          ecusson: universite.ecusson ?? "",
          domaines: universite.domaines ?? [],
          description: description.trim(),
          pointsForts: universite.pointsForts ?? [],
          imageCouleur: universite.imageCouleur ?? "",
          siteUrl: siteUrl.trim() || "",
          coverUrl: coverUrl.trim() || null,
          logoUrl: logoUrl.trim() || null,
          galleryUrls: galleryList,
          fraisMin: Number(fraisMin) || 0,
          fraisMax: Number(fraisMax) || 0,
          partenaire: universite.partenaire,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Enregistrement échoué", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success("Modifications enregistrées", { description: universite.nom });
      router.refresh();
    } catch {
      toast.error("Enregistrement échoué", { description: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/universites/${universite.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Suppression échouée", {
          description: (err as { error?: string })?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success("Université supprimée", {
        description: `${universite.nom} retirée du catalogue.`,
      });
      router.push("/admin/catalogue");
      router.refresh();
    } catch {
      toast.error("Suppression échouée", { description: "Erreur réseau." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2 text-ardoise hover:text-encre -ml-2">
          <Link href="/admin/catalogue">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Catalogue
          </Link>
        </Button>
        {universite.slug ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5 border-ligne">
            <Link href={`/universites/${universite.slug}`} target="_blank" rel="noopener noreferrer">
              Fiche publique
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-ligne bg-blanc shadow-sm">
        <div className="relative h-44 sm:h-56">
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              universite.imageCouleur || "from-lapis to-or",
            )}
          />
          {coverUrl.trim() ? (
            <MediaPreview src={coverUrl} alt="" className="absolute inset-0 h-full w-full" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-encre/70 via-encre/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:p-6">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-blanc bg-blanc shadow-md sm:h-20 sm:w-20">
              {logoUrl.trim() ? (
                <MediaPreview src={logoUrl} alt="" className="h-full w-full" />
              ) : (
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center font-mono text-sm font-bold text-blanc bg-gradient-to-br",
                    universite.imageCouleur || "from-lapis to-or",
                  )}
                >
                  {universite.ecusson}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-blanc/75">
                <span aria-hidden>{universite.drapeau}</span>
                Catalogue partenaire
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-blanc text-balance sm:text-3xl">
                {universite.nom}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-blanc/85">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                {ville || universite.ville}, {pays || universite.pays}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Identité */}
          <section className="rounded-2xl border border-ligne bg-blanc p-5 sm:p-6">
            <p className="eyebrow">Identité</p>
            <h2 className="mt-2 font-display text-lg font-bold text-encre">Fiche établissement</h2>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm text-encre">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-ligne bg-blanc px-3 py-2 text-sm text-encre"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ville" className="text-sm text-encre">
                    Ville
                  </Label>
                  <Input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pays" className="text-sm text-encre">
                    Pays
                  </Label>
                  <Input id="pays" value={pays} onChange={(e) => setPays(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fraisMin" className="text-sm text-encre">
                    Frais min (FCFA)
                  </Label>
                  <Input
                    id="fraisMin"
                    type="number"
                    value={fraisMin}
                    onChange={(e) => setFraisMin(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fraisMax" className="text-sm text-encre">
                    Frais max (FCFA)
                  </Label>
                  <Input
                    id="fraisMax"
                    type="number"
                    value={fraisMax}
                    onChange={(e) => setFraisMax(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Médias */}
          <section className="rounded-2xl border border-ligne bg-blanc p-5 sm:p-6">
            <p className="eyebrow">Médias Le Passage</p>
            <h2 className="mt-2 font-display text-lg font-bold text-encre">Visuels &amp; site</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="siteUrl" className="text-xs text-ardoise">
                  Site officiel
                </Label>
                <Input
                  id="siteUrl"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coverUrl" className="text-xs text-ardoise">
                  Cover URL
                </Label>
                <Input
                  id="coverUrl"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="/images/partenaires/.../cover.webp"
                  className="font-mono text-xs"
                />
                <MediaPreview
                  src={coverUrl}
                  alt="Cover"
                  className="mt-2 aspect-[16/9] w-full rounded-lg border border-ligne"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logoUrl" className="text-xs text-ardoise">
                  Logo URL
                </Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/images/partenaires/.../logo.png"
                  className="font-mono text-xs"
                />
                <MediaPreview
                  src={logoUrl}
                  alt="Logo"
                  className="mt-2 aspect-square w-28 rounded-lg border border-ligne"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="gallery" className="text-xs text-ardoise">
                  Galerie (1 chemin / ligne)
                </Label>
                <textarea
                  id="gallery"
                  value={gallery}
                  onChange={(e) => setGallery(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-ligne bg-blanc px-3 py-2 font-mono text-xs text-encre"
                  placeholder="/images/.../gallery-1.webp"
                />
                {galleryList.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {galleryList.map((src) => (
                      <MediaPreview
                        key={src}
                        src={src}
                        alt="Galerie"
                        className="aspect-[16/10] rounded-lg border border-ligne"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Formations */}
          <section className="rounded-2xl border border-ligne bg-blanc p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Formations</p>
                <h2 className="mt-2 font-display text-lg font-bold text-encre">
                  {universite.formations?.length ?? 0} formation
                  {(universite.formations?.length ?? 0) > 1 ? "s" : ""}
                </h2>
              </div>
              <GraduationCap className="h-5 w-5 text-lapis" strokeWidth={1.5} />
            </div>
            <ul className="mt-5 space-y-2">
              {(universite.formations ?? []).map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ligne px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-encre">{f.intitule}</p>
                    <p className="text-xs text-ardoise">
                      {f.niveau} · {f.domaine} · {f.duree}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-encre">
                    {formatFCFA(f.fraisAgence)}
                  </span>
                </li>
              ))}
              {(universite.formations?.length ?? 0) === 0 && (
                <li className="rounded-xl border border-dashed border-ligne px-4 py-6 text-center text-sm text-ardoise">
                  Aucune formation enregistrée.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Rail résumé */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-ligne bg-blanc p-5">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Aperçu</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-ligne pb-3">
                <dt className="text-ardoise">Ville</dt>
                <dd className="font-medium text-encre">{ville || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-ligne pb-3">
                <dt className="text-ardoise">Pays</dt>
                <dd className="font-medium text-encre">{pays || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-ligne pb-3">
                <dt className="text-ardoise">Frais min</dt>
                <dd className="font-mono text-encre">{formatFCFA(Number(fraisMin) || 0)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ardoise">Frais max</dt>
                <dd className="font-mono text-encre">{formatFCFA(Number(fraisMax) || 0)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ligne pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="border-carmin/40 text-carmin hover:bg-carmin/5"
              disabled={saving || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  Supprimer
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-blanc">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Supprimer cette université ?</AlertDialogTitle>
              <AlertDialogDescription>
                Action irréversible. {universite.nom} et ses {universite.formations?.length ?? 0}{" "}
                formation(s) seront retirées du catalogue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-carmin text-blanc hover:bg-carmin/90"
                onClick={handleDelete}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          className="min-w-36 bg-lapis text-blanc hover:bg-lapis/90"
          onClick={handleSave}
          disabled={saving || deleting}
        >
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
