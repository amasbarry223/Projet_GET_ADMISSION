"use client";

import * as React from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import { getApiErrorMessageSync, messageFromBody } from "@/lib/api-error";
import { formatDateFR } from "@/lib/format";
import { toast } from "sonner";
import { Upload, ShieldCheck, Camera, CheckCircle2, Save, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { addressSchema } from "@/lib/validations";
import {
  ProfilAcademiqueForm,
  emptyProfilAcademique,
  profilFromApi,
  type ProfilAcademiqueFormState,
} from "@/components/dossier/profil-academique-form";

type Profile = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  nationalite: string | null;
  dateNaissance: string | null;
  adresse: string | null;
  photoUrl: string | null;
  kycType: string | null;
  kycNumero: string | null;
  kycRectoPath?: string | null;
  kycVersoPath?: string | null;
  kycVerifie: boolean;
  kycVerifieLe: string | null;
  role: string;
  locked?: boolean;
  profilAcademique?: ProfilAcademiqueFormState | null;
};

type ProfileErrors = Partial<Record<"prenom" | "nom" | "adresse", string>>;
type PasswordErrors = Partial<Record<"current" | "next" | "confirm", string>>;

export default function ProfilPage() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [password, setPassword] = React.useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = React.useState({ current: false, next: false, confirm: false });
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [profileErrors, setProfileErrors] = React.useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = React.useState<PasswordErrors>({});
  const [profilAcademique, setProfilAcademique] = React.useState<ProfilAcademiqueFormState>(emptyProfilAcademique());
  const [savingAcademique, setSavingAcademique] = React.useState(false);
  const photoRef = React.useRef<HTMLInputElement>(null);

  const loadProfile = React.useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetch("/api/profile")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(messageFromBody(body) ?? getApiErrorMessageSync(r.status));
        }
        return r.json() as Promise<Profile>;
      })
      .then((data) => {
        setProfile(data);
        setProfilAcademique(profilFromApi(data.profilAcademique));
        setLoading(false);
      })
      .catch((e) => {
        setLoadError(getApiErrorMessageSync(e));
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadProfile();
    });
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  const setField = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    if (key === "prenom" || key === "nom" || key === "adresse") {
      setProfileErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const save = async () => {
    if (!profile) return;
    const errs: ProfileErrors = {};
    if (!profile.prenom.trim()) errs.prenom = "Le prénom est requis.";
    if (!profile.nom.trim()) errs.nom = "Le nom est requis.";
    if (profile.adresse?.trim()) {
      const parsedAddr = addressSchema.safeParse(profile.adresse);
      if (!parsedAddr.success) {
        errs.adresse = parsedAddr.error.issues[0]?.message ?? "Adresse invalide.";
      }
    }
    setProfileErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Champs incomplets ou invalides", { description: "Corrigez les champs indiqués." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: profile.prenom,
          nom: profile.nom,
          telephone: profile.telephone || undefined,
          nationalite: profile.nationalite || undefined,
          dateNaissance: profile.dateNaissance || undefined,
          adresse: profile.adresse || undefined,
          kycType: profile.kycType || undefined,
          kycNumero: profile.kycNumero || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(messageFromBody(data) ?? getApiErrorMessageSync(res.status));
      }
      setProfile((p) => (p ? { ...p, ...data } : p));
      void updateSession();
      toast.success("Profil enregistré", { description: "Vos informations ont été mises à jour." });
    } catch (e) {
      toast.error("Enregistrement échoué", { description: getApiErrorMessageSync(e) });
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(messageFromBody(data) ?? getApiErrorMessageSync(res.status));
      setProfile((p) => (p ? { ...p, photoUrl: data.photoUrl } : p));
      void updateSession();
      toast.success("Photo mise à jour");
    } catch (e) {
      toast.error("Photo", { description: getApiErrorMessageSync(e) });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const changePassword = async () => {
    const errs: PasswordErrors = {};
    if (!password.current) errs.current = "Indiquez votre mot de passe actuel.";
    if (!password.next) errs.next = "Indiquez le nouveau mot de passe.";
    else if (password.next.length < 8) errs.next = "Minimum 8 caractères.";
    if (!password.confirm) errs.confirm = "Confirmez le nouveau mot de passe.";
    else if (password.next && password.next !== password.confirm) {
      errs.confirm = "La confirmation ne correspond pas.";
    }
    setPasswordErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Mot de passe", { description: "Corrigez les champs indiqués." });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: password.current,
          newPassword: password.next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(messageFromBody(data) ?? getApiErrorMessageSync(res.status));
      setPassword({ current: "", next: "", confirm: "" });
      setPasswordErrors({});
      toast.success("Mot de passe modifié");
    } catch (e) {
      toast.error("Modification impossible", { description: getApiErrorMessageSync(e) });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <FormPageSkeleton />;
  }

  if (loadError || !profile) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Chargement impossible</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          {loadError ?? "Impossible de charger votre profil."}{" "}
          <button type="button" className="font-medium text-lapis underline" onClick={loadProfile}>
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const locked = !!profile.locked;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Profil</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Mes informations.</h1>
      </div>

      {locked && (
        <Alert className="border-ambre/40 bg-ambre/5">
          <AlertCircle className="h-4 w-4 text-ambre" strokeWidth={1.5} />
          <AlertTitle className="font-display text-sm font-bold text-encre">Profil verrouillé</AlertTitle>
          <AlertDescription className="text-sm text-ardoise">
            Votre dossier est en cours de traitement : vos informations personnelles, votre parcours académique et
            votre pièce d&apos;identité ne peuvent plus être modifiés. Vous pouvez toujours changer votre mot de
            passe ou votre photo.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-ligne bg-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-ligne bg-porcelaine">
              {profile.photoUrl ? (
                <Image src={profile.photoUrl} alt={`${profile.prenom} ${profile.nom}`} fill className="object-cover" sizes="64px" unoptimized={profile.photoUrl.startsWith("/api/")} />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-sm font-semibold text-lapis">
                  {profile.prenom[0]}
                  {profile.nom[0]}
                </div>
              )}
            </div>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-lapis text-blanc shadow-sm hover:bg-lapis/90 disabled:opacity-50"
              aria-label="Changer la photo"
            >
              {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" strokeWidth={1.5} />}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold text-encre">
              {profile.prenom} {profile.nom}
            </h2>
            <p className="text-sm text-ardoise">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge className="bg-lapis/10 font-mono text-[10px] uppercase text-lapis">Candidat</Badge>
              {profile.kycVerifie ? (
                <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">KYC vérifié</Badge>
              ) : (
                <Badge className="bg-ambre/10 font-mono text-[10px] uppercase text-ambre">KYC en attente</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="perso">
        <TabsList className="bg-porcelaine">
          <TabsTrigger value="perso">Informations personnelles</TabsTrigger>
          <TabsTrigger value="academique">Parcours académique</TabsTrigger>
          <TabsTrigger value="kyc">Pièce d&apos;identité (KYC)</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="perso">
          <Card className="border-ligne bg-card p-6">
            <fieldset disabled={locked} className="contents">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profil-prenom">Prénom</Label>
                <Input
                  id="profil-prenom"
                  value={profile.prenom}
                  onChange={(e) => setField("prenom", e.target.value)}
                  aria-invalid={!!profileErrors.prenom}
                  aria-describedby={profileErrors.prenom ? "err-prenom" : undefined}
                />
                <FieldError id="err-prenom" message={profileErrors.prenom} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profil-nom">Nom</Label>
                <Input
                  id="profil-nom"
                  value={profile.nom}
                  onChange={(e) => setField("nom", e.target.value)}
                  aria-invalid={!!profileErrors.nom}
                  aria-describedby={profileErrors.nom ? "err-nom" : undefined}
                />
                <FieldError id="err-nom" message={profileErrors.nom} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profil-email">E-mail</Label>
                <Input id="profil-email" type="email" value={profile.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profil-tel">Téléphone</Label>
                <Input id="profil-tel" value={profile.telephone ?? ""} onChange={(e) => setField("telephone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profil-nat">Nationalité</Label>
                <Input id="profil-nat" value={profile.nationalite ?? ""} onChange={(e) => setField("nationalite", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profil-naissance">Date de naissance</Label>
                <Input id="profil-naissance" type="date" value={profile.dateNaissance ?? ""} onChange={(e) => setField("dateNaissance", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profil-adresse">Adresse</Label>
                <Input
                  id="profil-adresse"
                  value={profile.adresse ?? ""}
                  placeholder="Ex: N° 12 Boulevard de la Paix, Quartier Cocody, Abidjan, Côte d'Ivoire"
                  onChange={(e) => setField("adresse", e.target.value)}
                  aria-invalid={!!profileErrors.adresse}
                  aria-describedby={profileErrors.adresse ? "err-adresse" : undefined}
                />
                <FieldError id="err-adresse" message={profileErrors.adresse} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={save} disabled={saving || locked} className="bg-lapis text-blanc hover:bg-lapis/90">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
            </fieldset>
          </Card>
        </TabsContent>

        <TabsContent value="academique">
          <Card className="border-ligne bg-card p-6">
            <p className="mb-4 text-sm text-ardoise">
              Ce parcours détermine automatiquement les documents demandés pour vos dossiers de candidature.
            </p>
            <fieldset disabled={locked} className="contents">
            <ProfilAcademiqueForm
              value={profilAcademique}
              onChange={setProfilAcademique}
              saving={savingAcademique}
              onSave={async () => {
                setSavingAcademique(true);
                try {
                  const res = await fetch("/api/profile/academique", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(profilAcademique),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(messageFromBody(data) ?? getApiErrorMessageSync(res.status));
                  }
                  setProfilAcademique(profilFromApi(data));
                  toast.success("Parcours académique enregistré");
                } catch (e) {
                  toast.error("Enregistrement échoué", { description: getApiErrorMessageSync(e) });
                } finally {
                  setSavingAcademique(false);
                }
              }}
            />
            </fieldset>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <Card className="border-ligne bg-card p-6">
            <fieldset disabled={locked} className="contents">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profil-kyc-type">Type de pièce</Label>
                  <Select value={profile.kycType ?? "passeport"} onValueChange={(v) => setField("kycType", v)}>
                    <SelectTrigger id="profil-kyc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="cni">Carte nationale d&apos;identité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profil-kyc-numero">Numéro</Label>
                  <Input
                    id="profil-kyc-numero"
                    className="font-mono"
                    value={profile.kycNumero ?? ""}
                    onChange={(e) => setField("kycNumero", e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-md border border-ligne bg-porcelaine p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md ${profile.kycVerifie ? "bg-vert/10" : "bg-ambre/10"}`}>
                    <CheckCircle2 className={`h-5 w-5 ${profile.kycVerifie ? "text-vert" : "text-ambre"}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-encre">{profile.kycVerifie ? "Pièce vérifiée" : "Vérification en attente"}</p>
                    <p className="text-xs text-ardoise">
                      {profile.kycType === "cni" ? "CNI" : "Passeport"}
                      {profile.kycVerifie && profile.kycVerifieLe
                        ? ` · Vérifié le ${formatDateFR(profile.kycVerifieLe)}`
                        : ""}
                    </p>
                  </div>
                  <Badge className={`ml-auto font-mono text-[10px] uppercase ${profile.kycVerifie ? "bg-vert/10 text-vert" : "bg-ambre/10 text-ambre"}`}>
                    {profile.kycVerifie ? "Vérifiée" : "En attente"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(["recto", "verso"] as const).map((side) => {
                  const hasFile = side === "recto" ? !!profile.kycRectoPath : !!profile.kycVersoPath;
                  return (
                    <div
                      key={side}
                      className="flex flex-col items-center justify-between rounded-lg border border-dashed border-ligne bg-card p-5 text-center transition-colors hover:border-lapis/40"
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-5 w-5 text-ardoise" strokeWidth={1.5} />
                        <p className="mt-2 text-xs font-medium text-encre">
                          {side === "recto" ? "Recto de la pièce" : "Verso de la pièce"}
                        </p>
                        <p className="text-[11px] text-ardoise">
                          {hasFile
                            ? "Document téléversé"
                            : side === "verso" && (profile.kycType ?? "passeport") === "passeport"
                              ? "Optionnel pour passeport"
                              : "Requis"}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full">
                        {hasFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-porcelaine/60"
                            onClick={() => window.open(`/api/profile/kyc?side=${side}`, "_blank")}
                          >
                            <Eye className="h-3.5 w-3.5 text-lapis" /> Voir le document
                          </Button>
                        )}
                        <label className="cursor-pointer">
                          <span className="inline-flex h-8 items-center justify-center rounded-md border border-ligne bg-card px-3 text-xs font-medium text-encre shadow-xs hover:bg-porcelaine">
                            {hasFile ? "Remplacer" : "Téléverser"}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="sr-only"
                            aria-label={`Téléverser le ${side} de la pièce d'identité`}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append("file", file);
                              fd.append("side", side);
                              if (profile.kycType) fd.append("kycType", profile.kycType);
                              if (profile.kycNumero) fd.append("kycNumero", profile.kycNumero);
                              const res = await fetch("/api/profile/kyc", { method: "POST", body: fd });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                toast.error("Upload KYC échoué", {
                                  description: messageFromBody(data) ?? getApiErrorMessageSync(res.status),
                                });
                                return;
                              }
                              setProfile((p) => (p ? { ...p, ...data.user } : p));
                              toast.success(`${side === "recto" ? "Recto" : "Verso"} téléversé`);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 rounded-md border border-ligne bg-card p-3 text-xs text-ardoise">
                <ShieldCheck className="h-4 w-4 text-vert" strokeWidth={1.5} />
                Vos données sont utilisées uniquement pour la constitution du dossier.
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving || locked} className="bg-lapis text-blanc hover:bg-lapis/90">
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Enregistrer le KYC
                </Button>
              </div>
            </div>
            </fieldset>
          </Card>
        </TabsContent>

        <TabsContent value="securite">
          <Card className="border-ligne bg-card p-6">
            <div className="grid gap-4 sm:max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="pwd-current">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    id="pwd-current"
                    type={showPasswords.current ? "text" : "password"}
                    value={password.current}
                    onChange={(e) => {
                      setPassword((p) => ({ ...p, current: e.target.value }));
                      setPasswordErrors((prev) => {
                        const { current: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className="pr-10"
                    autoComplete="current-password"
                    aria-invalid={!!passwordErrors.current}
                    aria-describedby={passwordErrors.current ? "err-pwd-current" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((s) => ({ ...s, current: !s.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ardoise hover:text-encre focus:outline-none"
                    aria-label={showPasswords.current ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
                <FieldError id="err-pwd-current" message={passwordErrors.current} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd-next">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="pwd-next"
                    type={showPasswords.next ? "text" : "password"}
                    value={password.next}
                    onChange={(e) => {
                      setPassword((p) => ({ ...p, next: e.target.value }));
                      setPasswordErrors((prev) => {
                        const { next: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className="pr-10"
                    autoComplete="new-password"
                    aria-invalid={!!passwordErrors.next}
                    aria-describedby={passwordErrors.next ? "err-pwd-next" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((s) => ({ ...s, next: !s.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ardoise hover:text-encre focus:outline-none"
                    aria-label={showPasswords.next ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPasswords.next ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
                <FieldError id="err-pwd-next" message={passwordErrors.next} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd-confirm">Confirmer</Label>
                <div className="relative">
                  <Input
                    id="pwd-confirm"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={password.confirm}
                    onChange={(e) => {
                      setPassword((p) => ({ ...p, confirm: e.target.value }));
                      setPasswordErrors((prev) => {
                        const { confirm: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className="pr-10"
                    autoComplete="new-password"
                    aria-invalid={!!passwordErrors.confirm}
                    aria-describedby={passwordErrors.confirm ? "err-pwd-confirm" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ardoise hover:text-encre focus:outline-none"
                    aria-label={showPasswords.confirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
                <FieldError id="err-pwd-confirm" message={passwordErrors.confirm} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={changePassword} disabled={savingPassword} className="bg-lapis text-blanc hover:bg-lapis/90">
                {savingPassword ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Changer le mot de passe
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
