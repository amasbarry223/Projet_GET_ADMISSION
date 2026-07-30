"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plane, Mail, Lock, ArrowRight, Loader2, ShieldCheck, Headset, Wallet, Crown } from "lucide-react";
import { toast } from "sonner";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Champs requis", { description: "Renseignez votre e-mail et votre mot de passe." });
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Connexion échouée", { description: "E-mail ou mot de passe incorrect." });
      return;
    }
    // Fetch session to determine role-based redirect
    const sess = await fetch("/api/auth/session").then((r) => r.json());
    const role = sess?.user?.role;
    toast.success("Connexion réussie", { description: `Bienvenue, ${sess?.user?.name}.` });
    if (role === "CANDIDAT") router.push("/espace");
    else if (role === "FINANCIER") router.push("/admin/finance");
    else if (role === "CONSEILLER") router.push("/admin/dossiers");
    else if (role === "SUPER_ADMIN") router.push("/admin/parametres");
    else router.push("/admin");
  };

  const demoLogin = async (demoEmail: string, href: string, label: string) => {
    setLoading(true);
    const res = await signIn("credentials", {
      email: demoEmail,
      password: "demo1234",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Erreur", { description: "Compte démo indisponible." });
      return;
    }
    toast.success("Mode démo activé", { description: `Vous explorez en tant que ${label}.` });
    router.push(href);
  };

  const DEMO_ACCOUNTS = [
    { email: "fatou.diallo@demo.getadm", label: "Candidat", href: "/espace", icon: ShieldCheck, desc: "Suivi du dossier" },
    { email: "a.diallo@getadm.com", label: "Conseiller", href: "/admin/dossiers", icon: Headset, desc: "Gère les dossiers" },
    { email: "m.kouassi@getadm.com", label: "Financier", href: "/admin/finance", icon: Wallet, desc: "Transactions" },
    { email: "y.bensaid@getadm.com", label: "Admin", href: "/admin", icon: ShieldCheck, desc: "Pilotage" },
    { email: "o.toure@getadm.com", label: "Super Admin", href: "/admin/parametres", icon: Crown, desc: "Configuration" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
            <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-encre">GET Admission</span>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Le passage</span>
          </span>
        </Link>

        <div className="rounded-lg border border-ligne bg-blanc p-8 shadow-md">
          <p className="eyebrow mb-2">Connexion</p>
          <h1 className="font-display text-2xl font-bold text-encre">Bon retour parmi nous.</h1>
          <p className="mt-1.5 text-sm text-ardoise">Connectez-vous pour accéder à votre espace.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-encre">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="vous@exemple.com" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-encre">Mot de passe</Label>
                <Link href="/mot-de-passe-oublie" className="text-xs font-medium text-lapis-clair hover:underline">Mot de passe oublié ?</Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" autoComplete="current-password" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-lapis text-blanc hover:bg-lapis/90" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion…</> : <>Se connecter <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ardoise">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-medium text-lapis-clair hover:underline">Créer mon dossier</Link>
          </p>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1 bg-ligne" />
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Comptes démo · mot de passe demo1234</span>
            <Separator className="flex-1 bg-ligne" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => demoLogin(acc.email, acc.href, acc.label)}
                className="group flex flex-col items-start gap-1 rounded-md border border-ligne bg-blanc p-3 text-left transition-all hover:-translate-y-0.5 hover:border-lapis/40 hover:shadow-sm disabled:opacity-50"
              >
                <acc.icon className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                <span className="text-sm font-medium text-encre">{acc.label}</span>
                <span className="text-[11px] text-ardoise">{acc.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
