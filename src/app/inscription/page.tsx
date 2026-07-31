"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Lock, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-ardoise" /></div>}>
      <InscriptionInner />
    </Suspense>
  );
}

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function InscriptionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [form, setForm] = React.useState({ prenom: "", nom: "", email: "", password: "", confirm: "", nationalite: "", consent: false });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [nationalites, setNationalites] = React.useState<string[]>([]);
  const [loadingNationalites, setLoadingNationalites] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/public/nationalites")
      .then((r) => r.json())
      .then((data: string[]) => {
        setNationalites(Array.isArray(data) ? data : []);
        setLoadingNationalites(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setNationalites([]);
        setLoadingNationalites(false);
      });
  }, []);

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.prenom.trim()) e.prenom = "Veuillez renseigner votre prénom.";
    if (!form.nom.trim()) e.nom = "Veuillez renseigner votre nom.";
    if (!form.email.trim()) e.email = "Veuillez renseigner votre e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "L'e-mail saisi n'est pas valide.";
    if (!form.password) e.password = "Veuillez choisir un mot de passe.";
    else if (form.password.length < 8) e.password = "Le mot de passe doit contenir au moins 8 caractères.";
    if (form.confirm !== form.password) e.confirm = "Les mots de passe ne correspondent pas.";
    if (!form.nationalite) e.nationalite = "Sélectionnez votre nationalité.";
    if (!form.consent) e.consent = "Vous devez accepter les conditions d'agence.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Formulaire incomplet", { description: "Vérifiez les champs signalés." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          password: form.password,
          nationalite: form.nationalite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Inscription échouée", { description: data.error || "Erreur lors de la création du compte." });
        setLoading(false);
        return;
      }
      // BF-06 : Vérification de l'e-mail requise
      const q = new URLSearchParams({
        status: "pending",
        email: form.email,
        message: "Un e-mail de vérification vient d'être envoyé. Consultez votre boîte mail pour activer votre compte.",
      });
      if (data.verifyUrl) q.set("verifyUrl", data.verifyUrl);
      if (callbackUrl) q.set("callbackUrl", callbackUrl);
      router.push(`/verification-email?${q.toString()}`);
      return;
    } catch {
      toast.error("Erreur", { description: "Une erreur est survenue. Réessayez." });
    }
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: editorial */}
      <div className="relative hidden flex-col justify-between bg-porcelaine p-10 lg:flex">
        <div className="rule-or absolute inset-x-0 top-0" aria-hidden />
        <Link href="/" className="inline-flex">
          <BrandLogo height={48} priority />
        </Link>

        <div className="max-w-md">
          <p className="eyebrow-or mb-4">Première étape</p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-encre">
            Créez votre compte<br />en quelques minutes.
          </h1>
          <p className="mt-4 text-ardoise">
            Ouvrez votre espace candidat. Ensuite, choisissez votre université et composez votre dossier.
          </p>

          <ul className="mt-6 space-y-2.5">
            {["Suivi en temps réel, étape par étape", "Conseiller dédié de la constitution à l'attestation", "Paiement Mobile Money & carte bancaire"].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-sm text-encre">
                <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.5} />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-md border border-ligne bg-blanc p-4">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-lapis">Déjà un compte ?</p>
            <p className="mt-1 text-sm text-encre">
              Connectez-vous pour reprendre votre parcours ou composer votre dossier.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={callbackUrl ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/connexion"}>
                Se connecter <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </Button>
          </div>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">Confidentiel — GET Admission</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-blanc p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center">
            <BrandLogo height={40} />
          </div>

          <p className="eyebrow mb-2">Inscription</p>
          <h2 className="font-display text-2xl font-bold text-encre">Créer mon compte.</h2>
          <p className="mt-1.5 text-sm text-ardoise">Quelques informations pour ouvrir votre espace candidat.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prenom" className="text-sm font-medium text-encre">Prénom</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                  <Input id="prenom" value={form.prenom} onChange={(e) => set("prenom", e.target.value)} className={cn("pl-9", errors.prenom && "border-carmin")} placeholder="Fatou" aria-invalid={!!errors.prenom} />
                </div>
                {errors.prenom && <p className="text-xs text-carmin">{errors.prenom}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom" className="text-sm font-medium text-encre">Nom</Label>
                <Input id="nom" value={form.nom} onChange={(e) => set("nom", e.target.value)} className={cn(errors.nom && "border-carmin")} placeholder="Diallo" aria-invalid={!!errors.nom} />
                {errors.nom && <p className="text-xs text-carmin">{errors.nom}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-encre">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={cn("pl-9", errors.email && "border-carmin")} placeholder="vous@exemple.com" aria-invalid={!!errors.email} />
              </div>
              {errors.email && <p className="text-xs text-carmin">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nationalite" className="text-sm font-medium text-encre">Nationalité</Label>
              <Select value={form.nationalite} onValueChange={(v) => set("nationalite", v)}>
                <SelectTrigger id="nationalite" className={cn(errors.nationalite && "border-carmin")} aria-invalid={!!errors.nationalite}>
                  <SelectValue placeholder={loadingNationalites ? "Chargement…" : "Sélectionnez votre nationalité"} />
                </SelectTrigger>
                <SelectContent>
                  {nationalites.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.nationalite && <p className="text-xs text-carmin">{errors.nationalite}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-encre">Mot de passe</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                  <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className={cn("pl-9", errors.password && "border-carmin")} placeholder="Minimum 8 caractères" aria-invalid={!!errors.password} />
                </div>
                {errors.password && <p className="text-xs text-carmin">{errors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-medium text-encre">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                  <Input id="confirm" type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} className={cn("pl-9", errors.confirm && "border-carmin")} placeholder="••••••••" aria-invalid={!!errors.confirm} />
                </div>
                {errors.confirm && <p className="text-xs text-carmin">{errors.confirm}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="consent" className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => set("consent", !!v)} className="mt-0.5" />
                <span className="text-xs text-ardoise">
                  J&apos;accepte les{" "}
                  <Link href="/mentions-legales" className="text-lapis-clair hover:underline">
                    conditions d&apos;agence
                  </Link>{" "}
                  et la{" "}
                  <Link href="/mentions-legales" className="text-lapis-clair hover:underline">
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
              {errors.consent && <p className="text-xs text-carmin">{errors.consent}</p>}
            </div>

            <Button type="submit" className="w-full bg-lapis text-blanc hover:bg-lapis/90" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création…</> : <>Créer mon compte <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ardoise">
            Déjà un compte ?{" "}
            <Link
              href={callbackUrl ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/connexion"}
              className="font-medium text-lapis-clair hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
