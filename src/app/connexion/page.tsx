"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plane, Mail, Lock, ArrowRight, GraduationCap, Headset, Wallet, ShieldCheck, Crown } from "lucide-react";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { useAuth, type Role } from "@/lib/auth-context";
import { DOSSIER_DEMO_CANDIDAT } from "@/lib/mock/dossiers";
import { formationParId } from "@/lib/mock/formations";
import { UNIVERSITES } from "@/lib/mock/universites";
import { toast } from "sonner";

const DEMO_ROLES: { role: Role; label: string; href: string; icon: React.ElementType; desc: string }[] = [
  { role: "candidat", label: "Candidat", href: "/espace", icon: GraduationCap, desc: "Suivi du dossier" },
  { role: "conseiller", label: "Conseiller", href: "/admin/dossiers", icon: Headset, desc: "Gère les dossiers" },
  { role: "financier", label: "Financier", href: "/admin/finance", icon: Wallet, desc: "Transactions" },
  { role: "admin", label: "Admin", href: "/admin", icon: ShieldCheck, desc: "Pilotage" },
  { role: "super-admin", label: "Super Admin", href: "/admin/parametres", icon: Crown, desc: "Configuration" },
];

export default function ConnexionPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = React.useState("fatou.diallo@demo.getadm");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Champs requis", { description: "Renseignez votre e-mail et votre mot de passe." });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      signIn("candidat");
      toast.success("Connexion réussie", { description: "Bienvenue dans votre espace candidat." });
      router.push("/espace");
    }, 600);
  };

  const demo = (role: Role, href: string) => {
    signIn(role);
    toast.success("Mode démo activé", { description: `Vous explorez en tant que ${role.replace("-", " ")}.` });
    router.push(href);
  };

  const d = DOSSIER_DEMO_CANDIDAT;
  const univ = UNIVERSITES.find((u) => u.id === d.universiteId);
  const form = formationParId(d.formationId);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: editorial + boarding pass */}
      <div className="relative hidden flex-col justify-between bg-porcelaine p-10 lg:flex">
        <div className="rule-or absolute inset-x-0 top-0" aria-hidden />
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
            <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-encre">GET Admission</span>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Le passage</span>
          </span>
        </Link>

        <div className="max-w-md">
          <p className="eyebrow-or mb-4">Votre passage vers l'international</p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-encre">
            Reprenez votre dossier<br />là où vous l'avez laissé.
          </h1>
          <p className="mt-4 text-ardoise">
            Suivi en temps réel, conseiller dédié, attestation officielle. Une seule plateforme, du premier document au tampon final.
          </p>

          <div className="mt-8">
            <BoardingPass
              variant="large"
              animateOnMount
              reference={d.reference}
              universiteNom={univ?.nom ?? ""}
              formationLabel={`${form?.niveau ?? ""} · ${form?.domaine ?? ""}`}
              etat={d.etat}
              etapeActuelle={d.etapeActuelle}
              etapeTotal={12}
              conseiller={d.conseillerNom}
              fraisAgence={d.fraisAgence}
              mrz={d.mrz}
            />
          </div>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">
          Confidentiel — GET Admission
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-blanc p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
              <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
            </span>
            <span className="font-display text-base font-bold text-encre">GET Admission</span>
          </div>

          <p className="eyebrow mb-2">Connexion</p>
          <h2 className="font-display text-2xl font-bold text-encre">Bon retour parmi nous.</h2>
          <p className="mt-1.5 text-sm text-ardoise">Connectez-vous pour accéder à votre espace candidat.</p>

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
              {loading ? "Connexion…" : "Se connecter"}
              {!loading && <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ardoise">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-medium text-lapis-clair hover:underline">Créer mon dossier</Link>
          </p>

          <div className="my-8 flex items-center gap-3">
            <Separator className="flex-1 bg-ligne" />
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Explorer en démo</span>
            <Separator className="flex-1 bg-ligne" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => demo(r.role, r.href)}
                className="group flex flex-col items-start gap-1 rounded-md border border-ligne bg-blanc p-3 text-left transition-all hover:-translate-y-0.5 hover:border-lapis/40 hover:shadow-sm"
              >
                <r.icon className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                <span className="text-sm font-medium text-encre">{r.label}</span>
                <span className="text-[11px] text-ardoise">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
