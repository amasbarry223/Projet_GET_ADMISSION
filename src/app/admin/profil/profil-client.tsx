"use client";

import * as React from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field-error";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import { getApiErrorMessageSync, messageFromBody } from "@/lib/api-error";
import { toast } from "sonner";
import { Camera, Save, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

type StaffProfile = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  photoUrl: string | null;
  role: string;
};

type ProfileErrors = Partial<Record<"prenom" | "nom", string>>;
type PasswordErrors = Partial<Record<"current" | "next" | "confirm", string>>;

export default function AdminProfilClient() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [password, setPassword] = React.useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = React.useState({ current: false, next: false, confirm: false });
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [profileErrors, setProfileErrors] = React.useState<ProfileErrors>({});
  const [passwordErrors, setPasswordErrors] = React.useState<PasswordErrors>({});
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
        return r.json() as Promise<StaffProfile>;
      })
      .then((data) => {
        setProfile(data);
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

  const setField = <K extends keyof StaffProfile>(key: K, value: StaffProfile[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    if (key === "prenom" || key === "nom") {
      setProfileErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const save = async () => {
    if (!profile) return;
    const errs: ProfileErrors = {};
    if (!profile.prenom.trim()) errs.prenom = "Le prénom est requis.";
    if (!profile.nom.trim()) errs.nom = "Le nom est requis.";
    setProfileErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Champs incomplets", { description: "Corrigez les champs indiqués." });
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
          telephone: profile.telephone,
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

  const roleLabel = profile.role.replace(/_/g, " ").toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Profil</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Mon profil.</h1>
      </div>

      <Card className="border-ligne bg-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-ligne bg-porcelaine">
              {profile.photoUrl ? (
                <Image
                  src={profile.photoUrl}
                  alt={`${profile.prenom} ${profile.nom}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized={profile.photoUrl.startsWith("/api/")}
                />
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
              <Badge className="bg-lapis/10 font-mono text-[10px] uppercase text-lapis">{roleLabel}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="perso">
        <TabsList className="bg-porcelaine">
          <TabsTrigger value="perso">Informations personnelles</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="perso">
          <Card className="border-ligne bg-card p-6">
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
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={save} disabled={saving} className="bg-lapis text-blanc hover:bg-lapis/90">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
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
