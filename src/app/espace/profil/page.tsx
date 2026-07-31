"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, ShieldCheck, Camera, CheckCircle2, Save, Loader2 } from "lucide-react";

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
};

export default function ProfilPage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [password, setPassword] = React.useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = React.useState(false);
  const photoRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const setField = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: profile.prenom,
          nom: profile.nom,
          telephone: profile.telephone,
          nationalite: profile.nationalite,
          dateNaissance: profile.dateNaissance,
          adresse: profile.adresse,
          kycType: profile.kycType,
          kycNumero: profile.kycNumero,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec");
      }
      const updated = await res.json();
      setProfile((p) => (p ? { ...p, ...updated } : p));
      toast.success("Profil enregistré");
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : "Échec" });
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
      if (!res.ok) throw new Error(data.error || "Upload échoué");
      setProfile((p) => (p ? { ...p, photoUrl: data.photoUrl } : p));
      toast.success("Photo mise à jour");
    } catch (e) {
      toast.error("Photo", { description: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const changePassword = async () => {
    if (!password.current || !password.next || !password.confirm) {
      toast.error("Champs manquants");
      return;
    }
    if (password.next.length < 8) {
      toast.error("Mot de passe trop court", { description: "Minimum 8 caractères." });
      return;
    }
    if (password.next !== password.confirm) {
      toast.error("Confirmation incorrecte");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password.current, newPassword: password.next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec");
      }
      toast.success("Mot de passe modifié");
      setPassword({ current: "", next: "", confirm: "" });
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : "Échec" });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-ardoise">Impossible de charger votre profil.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Profil</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Mes informations.</h1>
      </div>

      <Card className="border-ligne bg-blanc p-6">
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
          <TabsTrigger value="kyc">Pièce d&apos;identité (KYC)</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="perso">
          <Card className="border-ligne bg-blanc p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input value={profile.prenom} onChange={(e) => setField("prenom", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={profile.nom} onChange={(e) => setField("nom", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={profile.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={profile.telephone ?? ""} onChange={(e) => setField("telephone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nationalité</Label>
                <Input value={profile.nationalite ?? ""} onChange={(e) => setField("nationalite", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" value={profile.dateNaissance ?? ""} onChange={(e) => setField("dateNaissance", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Adresse</Label>
                <Input value={profile.adresse ?? ""} onChange={(e) => setField("adresse", e.target.value)} />
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

        <TabsContent value="kyc">
          <Card className="border-ligne bg-blanc p-6">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type de pièce</Label>
                  <Select
                    value={profile.kycType ?? "passeport"}
                    onValueChange={(v) => setField("kycType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="cni">Carte nationale d&apos;identité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Numéro</Label>
                  <Input
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
                        ? ` · Vérifié le ${new Date(profile.kycVerifieLe).toLocaleDateString("fr-FR")}`
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
                    <label
                      key={side}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-ligne bg-blanc p-6 text-center hover:border-lapis/40"
                    >
                      <Upload className="h-5 w-5 text-ardoise" strokeWidth={1.5} />
                      <p className="mt-2 text-xs text-ardoise">
                        {side === "recto" ? "Recto" : "Verso"}
                        {hasFile
                          ? " · fichier présent"
                          : side === "verso" && (profile.kycType ?? "passeport") === "passeport"
                            ? " · optionnel"
                            : " · requis"}
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="sr-only"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("side", side);
                          if (profile.kycType) fd.append("kycType", profile.kycType);
                          if (profile.kycNumero) fd.append("kycNumero", profile.kycNumero);
                          const res = await fetch("/api/profile/kyc", { method: "POST", body: fd });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            toast.error("Upload KYC échoué", { description: data.error });
                            return;
                          }
                          const data = await res.json();
                          setProfile((p) => (p ? { ...p, ...data.user } : p));
                          toast.success(`${side === "recto" ? "Recto" : "Verso"} téléversé`);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 rounded-md border border-ligne bg-blanc p-3 text-xs text-ardoise">
                <ShieldCheck className="h-4 w-4 text-vert" strokeWidth={1.5} />
                Vos données sont utilisées uniquement pour la constitution du dossier.
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} className="bg-lapis text-blanc hover:bg-lapis/90">
                  {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Enregistrer le KYC
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="securite">
          <Card className="border-ligne bg-blanc p-6">
            <div className="grid gap-4 sm:max-w-md">
              <div className="space-y-1.5">
                <Label>Mot de passe actuel</Label>
                <Input type="password" value={password.current} onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label>Nouveau mot de passe</Label>
                <Input type="password" value={password.next} onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmer</Label>
                <Input type="password" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
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
