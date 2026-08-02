"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  GraduationCap,
  ImagePlus,
  Loader2,
  MapPin,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { normalizeUniversite } from "@/lib/types";
import { formatFCFA } from "@/lib/format";
import { resolveFraisAgence } from "@/lib/dossier/frais-agence";
import { cn } from "@/lib/utils";
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

export type UniversiteNormalized = ReturnType<typeof normalizeUniversite>;

type MediaKind = "cover" | "logo" | "gallery";

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
     
    <img src={trimmed} alt={alt} className={cn("object-cover", className)} />
  );
}

export function CatalogueDetailClient({ universite }: { universite: UniversiteNormalized }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [uploadingKind, setUploadingKind] = React.useState<MediaKind | null>(null);
  const [removingMedia, setRemovingMedia] = React.useState(false);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  const [description, setDescription] = React.useState(universite.description ?? "");
  const [ville, setVille] = React.useState(universite.ville ?? "");
  const [pays, setPays] = React.useState(universite.pays ?? "");
  const [fraisMin, setFraisMin] = React.useState(String(universite.fraisMin ?? 0));
  const [fraisMax, setFraisMax] = React.useState(String(universite.fraisMax ?? 0));
  const [typeEtablissement, setTypeEtablissement] = React.useState<"PUBLIC" | "PRIVE">(
    (universite as { typeEtablissement?: "PUBLIC" | "PRIVE" }).typeEtablissement ?? "PRIVE"
  );
  const [siteUrl, setSiteUrl] = React.useState(universite.siteUrl ?? "");
  const [coverUrl, setCoverUrl] = React.useState(universite.coverUrl ?? "");
  const [logoUrl, setLogoUrl] = React.useState(universite.logoUrl ?? "");
  const [galleryList, setGalleryList] = React.useState<string[]>(universite.galleryUrls ?? []);

  const [prevUniversite, setPrevUniversite] = React.useState(universite);
  if (universite !== prevUniversite) {
    setPrevUniversite(universite);
    setDescription(universite.description ?? "");
    setVille(universite.ville ?? "");
    setPays(universite.pays ?? "");
    setFraisMin(String(universite.fraisMin ?? 0));
    setFraisMax(String(universite.fraisMax ?? 0));
    setTypeEtablissement(
      (universite as { typeEtablissement?: "PUBLIC" | "PRIVE" }).typeEtablissement ?? "PRIVE"
    );
    setSiteUrl(universite.siteUrl ?? "");
    setCoverUrl(universite.coverUrl ?? "");
    setLogoUrl(universite.logoUrl ?? "");
    setGalleryList(universite.galleryUrls ?? []);
  }

  const mediaBusy = uploadingKind !== null || removingMedia;

  const uploadMedia = async (kind: MediaKind, file: File) => {
    setUploadingKind(kind);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch(`/api/universites/${universite.id}/media`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        galleryUrls?: string[];
      };
      if (!res.ok) {
        toast.error("Upload échoué", { description: data.error ?? "Erreur serveur." });
        return;
      }
      if (kind === "cover" && data.url) setCoverUrl(data.url);
      if (kind === "logo" && data.url) setLogoUrl(data.url);
      if (kind === "gallery" && data.galleryUrls) setGalleryList(data.galleryUrls);
      toast.success(
        kind === "cover" ? "Cover mis à jour" : kind === "logo" ? "Logo mis à jour" : "Image ajoutée",
      );
      router.refresh();
    } catch {
      toast.error("Upload échoué", { description: "Erreur réseau." });
    } finally {
      setUploadingKind(null);
    }
  };

  const removeMedia = async (kind: MediaKind, url?: string) => {
    setRemovingMedia(true);
    try {
      const res = await fetch(`/api/universites/${universite.id}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, url }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        galleryUrls?: string[];
      };
      if (!res.ok) {
        toast.error("Suppression échouée", { description: data.error ?? "Erreur serveur." });
        return;
      }
      if (kind === "cover") setCoverUrl("");
      if (kind === "logo") setLogoUrl("");
      if (kind === "gallery" && data.galleryUrls) setGalleryList(data.galleryUrls);
      toast.success("Média retiré");
      router.refresh();
    } catch {
      toast.error("Suppression échouée", { description: "Erreur réseau." });
    } finally {
      setRemovingMedia(false);
    }
  };

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      await uploadMedia("gallery", file);
    }
  };

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
          typeEtablissement,
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
                  <Label htmlFor="typeEtab" className="text-sm text-encre">
                    Type d&apos;établissement
                  </Label>
                  <Select
                    value={typeEtablissement}
                    onValueChange={(v) => {
                      const t = v as "PUBLIC" | "PRIVE";
                      setTypeEtablissement(t);
                      if (t === "PUBLIC") {
                        setFraisMin("65000");
                        setFraisMax("65000");
                      } else {
                        setFraisMin("110000");
                        setFraisMax("110000");
                      }
                    }}
                  >
                    <SelectTrigger id="typeEtab">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public — 65 000 FCFA</SelectItem>
                      <SelectItem value="PRIVE">Privé — 110 000 FCFA</SelectItem>
                    </SelectContent>
                  </Select>
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

            <div className="mt-5 space-y-5">
              <div className="space-y-1.5">
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

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Cover */}
                <div className="space-y-2">
                  <Label className="text-xs text-ardoise">Cover</Label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadMedia("cover", f);
                      e.target.value = "";
                    }}
                  />
                  <div className="relative overflow-hidden rounded-lg border border-ligne">
                    {coverUrl.trim() ? (
                      <MediaPreview
                        src={coverUrl}
                        alt="Cover"
                        className="aspect-[16/9] w-full"
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={mediaBusy}
                        onClick={() => coverInputRef.current?.click()}
                        className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 bg-porcelaine text-ardoise transition-colors hover:bg-porcelaine/80 disabled:opacity-50"
                      >
                        {uploadingKind === "cover" ? (
                          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                        )}
                        <span className="text-xs">Choisir une cover</span>
                      </button>
                    )}
                    {uploadingKind === "cover" && coverUrl.trim() ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-encre/40">
                        <Loader2 className="h-6 w-6 animate-spin text-blanc" strokeWidth={1.5} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-ligne"
                      disabled={mediaBusy}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {coverUrl.trim() ? "Remplacer" : "Uploader"}
                    </Button>
                    {coverUrl.trim() ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-carmin/40 text-carmin hover:bg-carmin/5"
                        disabled={mediaBusy}
                        onClick={() => void removeMedia("cover")}
                      >
                        Supprimer
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label className="text-xs text-ardoise">Logo</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadMedia("logo", f);
                      e.target.value = "";
                    }}
                  />
                  <div className="relative w-28 overflow-hidden rounded-lg border border-ligne">
                    {logoUrl.trim() ? (
                      <MediaPreview
                        src={logoUrl}
                        alt="Logo"
                        className="aspect-square w-28"
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={mediaBusy}
                        onClick={() => logoInputRef.current?.click()}
                        className="flex aspect-square w-28 flex-col items-center justify-center gap-1 bg-porcelaine text-ardoise transition-colors hover:bg-porcelaine/80 disabled:opacity-50"
                      >
                        {uploadingKind === "logo" ? (
                          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                        )}
                        <span className="text-[10px]">Logo</span>
                      </button>
                    )}
                    {uploadingKind === "logo" && logoUrl.trim() ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-encre/40">
                        <Loader2 className="h-5 w-5 animate-spin text-blanc" strokeWidth={1.5} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-ligne"
                      disabled={mediaBusy}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoUrl.trim() ? "Remplacer" : "Uploader"}
                    </Button>
                    {logoUrl.trim() ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-carmin/40 text-carmin hover:bg-carmin/5"
                        disabled={mediaBusy}
                        onClick={() => void removeMedia("logo")}
                      >
                        Supprimer
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Galerie */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs text-ardoise">Galerie</Label>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      void handleGalleryFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-ligne gap-1.5"
                    disabled={mediaBusy}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    {uploadingKind === "gallery" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    Ajouter
                  </Button>
                </div>
                {galleryList.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {galleryList.map((src) => (
                      <div
                        key={src}
                        className="group relative overflow-hidden rounded-lg border border-ligne"
                      >
                        <MediaPreview
                          src={src}
                          alt="Galerie"
                          className="aspect-[16/10]"
                        />
                        <button
                          type="button"
                          disabled={mediaBusy}
                          onClick={() => void removeMedia("gallery", src)}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-encre/75 text-blanc opacity-100 transition-opacity hover:bg-encre disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Retirer de la galerie"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={mediaBusy}
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ligne bg-porcelaine px-4 py-8 text-ardoise transition-colors hover:bg-porcelaine/80 disabled:opacity-50"
                  >
                    <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                    <span className="text-xs">Ajouter des images à la galerie</span>
                  </button>
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
                    {formatFCFA(resolveFraisAgence(typeEtablissement))}
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
              disabled={saving || deleting || mediaBusy}
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
          disabled={saving || deleting || mediaBusy}
        >
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
