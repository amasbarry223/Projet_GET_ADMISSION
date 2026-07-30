"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Upload, ShieldCheck, Lock, Camera, CheckCircle2, Save, Loader2 } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  nationalite: string | null;
  dateNaissance: string | null;
  adresse: string | null;
  role: string;
};

export default function ProfilPage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [kycType, setKycType] = React.useState("passeport");
  const [password, setPassword] = React.useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setProfile(data); setLoading(false); })
      .catch((e) => { console.error("fetch error:", e); setLoading(false); });
  }, []);

  const save = async (section: string) => {
    if (!profile) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        toast.success("Modifications enregistrées", { description: `${section} mis à jour.` });
      } else {
        toast.error("Erreur", { description: "Échec de l'enregistrement." });
      }
    } catch {
      toast.error("Erreur", { description: "Échec de l'enregistrement." });
    }
  };

  const changePassword = async () => {
    if (!password.current || !password.next || !password.confirm) {
      toast.error("Champs manquants", { description: "Renseignez les trois champs mot de passe." });
      return;
    }
    if (password.next.length < 8) {
      toast.error("Mot de passe trop court", { description: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (password.next !== password.confirm) {
      toast.error("Confirmation incorrecte", { description: "Le nouveau mot de passe et sa confirmation ne correspondent pas." });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password.current, newPassword: password.next }),
      });
      if (res.ok) {
        toast.success("Mot de passe modifié");
        setPassword({ current: "", next: "", confirm: "" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Erreur", { description: data.error || "Échec de la mise à jour." });
      }
    } catch {
      toast.error("Erreur", { description: "Échec de la mise à jour." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-lapis" /></div>;
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

      {/* Identity header */}
      <Card className="border-ligne bg-blanc p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-ligne">
              <Image src="/images/candidate-portrait.png" alt="Fatou Diallo" fill className="object-cover" sizes="64px" />
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-lapis text-blanc shadow-sm hover:bg-lapis/90" aria-label="Changer la photo">
              <Camera className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold text-encre">{`${profile.prenom} ${profile.nom}`}</h2>
            <p className="text-sm text-ardoise">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge className="bg-lapis/10 font-mono text-[10px] uppercase text-lapis">Candidat</Badge>
              <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">KYC vérifié</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="perso">
        <TabsList className="bg-porcelaine">
          <TabsTrigger value="perso">Informations personnelles</TabsTrigger>
          <TabsTrigger value="kyc">Pièce d'identité (KYC)</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        {/* Personal info */}
        <TabsContent value="perso">
          <Card className="border-ligne bg-blanc p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Prénom</Label>
                <Input defaultValue={profile.prenom ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Nom</Label>
                <Input defaultValue={profile.nom ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">E-mail</Label>
                <Input type="email" defaultValue={profile.email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Téléphone</Label>
                <Input defaultValue={profile.telephone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Nationalité</Label>
                <Input defaultValue={profile.nationalite ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Date de naissance</Label>
                <Input type="date" defaultValue={profile.dateNaissance ?? ""} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-encre">Adresse</Label>
                <Input defaultValue={profile.adresse ?? ""} />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => save("Profil")} className="bg-lapis text-blanc hover:bg-lapis/90">
                <Save className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Enregistrer
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* KYC */}
        <TabsContent value="kyc">
          <Card className="border-ligne bg-blanc p-6">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Type de pièce</Label>
                  <Select value={kycType} onValueChange={setKycType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="cni">Carte nationale d'identité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-encre">Numéro</Label>
                  <Input defaultValue="SN1234567" className="font-mono" />
                </div>
              </div>

              <div className="rounded-md border border-ligne bg-porcelaine p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-vert/10">
                    <CheckCircle2 className="h-5 w-5 text-vert" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-encre">Pièce vérifiée</p>
                    <p className="text-xs text-ardoise">Passeport · Vérifié le 14 janvier 2026</p>
                  </div>
                  <Badge className="ml-auto bg-vert/10 font-mono text-[10px] uppercase text-vert">Vérifiée</Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-ligne bg-blanc p-6 text-center">
                  <Upload className="h-5 w-5 text-ardoise" strokeWidth={1.5} />
                  <p className="mt-2 text-xs text-ardoise">Recto · passeport.pdf · 1,1 Mo</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-ligne bg-blanc p-6 text-center">
                  <Upload className="h-5 w-5 text-ardoise" strokeWidth={1.5} />
                  <p className="mt-2 text-xs text-ardoise">Verso · non requis pour passeport</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-ligne bg-blanc p-3 text-xs text-ardoise">
                <ShieldCheck className="h-4 w-4 text-vert" strokeWidth={1.5} />
                Vos données sont chiffrées et utilisées uniquement pour la constitution du dossier.
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="securite">
          <Card className="border-ligne bg-blanc p-6">
            <div className="grid gap-4 sm:max-w-md">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Mot de passe actuel</Label>
                <Input type="password" placeholder="••••••••" value={password.current} onChange={(e) => setPassword((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Nouveau mot de passe</Label>
                <Input type="password" placeholder="Minimum 8 caractères" value={password.next} onChange={(e) => setPassword((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Confirmer le nouveau mot de passe</Label>
                <Input type="password" placeholder="••••••••" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={changePassword} disabled={savingPassword} className="bg-lapis text-blanc hover:bg-lapis/90">
                {savingPassword ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} /> Mise à jour…</> : <><Lock className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Mettre à jour</>}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
