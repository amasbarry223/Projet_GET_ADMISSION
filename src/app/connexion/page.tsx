"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { defaultAdminRoute, isStaff } from "@/lib/rbac";

type PortalTab = "etudiant" | "staff";

export default function ConnexionPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <Image
        src="/images/auth-students-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        aria-hidden
      />
      <div className="absolute inset-0 bg-encre/55" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-blanc" />}>
          <ConnexionInner />
        </Suspense>
      </div>
    </div>
  );
}

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** N’honore callbackUrl que s’il correspond à l’espace du rôle. */
function callbackForRole(role: string | undefined, callbackUrl: string | null): string | null {
  if (!callbackUrl || !role) return null;
  if (role === "CANDIDAT") {
    return callbackUrl === "/espace" || callbackUrl.startsWith("/espace/") ? callbackUrl : null;
  }
  return callbackUrl === "/admin" || callbackUrl.startsWith("/admin/") ? callbackUrl : null;
}

function initialPortal(searchParams: URLSearchParams, callbackUrl: string | null): PortalTab {
  const portal = searchParams.get("portal");
  if (portal === "staff" || portal === "backoffice") return "staff";
  if (portal === "etudiant" || portal === "candidat") return "etudiant";
  if (callbackUrl === "/admin" || callbackUrl?.startsWith("/admin/")) return "staff";
  if (callbackUrl === "/espace" || callbackUrl?.startsWith("/espace/")) return "etudiant";
  return "etudiant";
}

function ConnexionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [portalTab, setPortalTab] = React.useState<PortalTab>(() =>
    initialPortal(searchParams, callbackUrl),
  );
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [unverifiedHint, setUnverifiedHint] = React.useState(false);
  const [suggestStudentPortal, setSuggestStudentPortal] = React.useState(false);

  const isStudent = portalTab === "etudiant";
  const authPortal = isStudent ? "candidat" : "staff";

  const redirectAfterLogin = async (role: string | undefined) => {
    const allowedCallback = callbackForRole(role, callbackUrl);
    if (allowedCallback) {
      router.push(allowedCallback);
      return;
    }
    if (role === "CANDIDAT") {
      try {
        const dossiers = await fetch("/api/dossiers").then((r) => (r.ok ? r.json() : []));
        const list = Array.isArray(dossiers) ? dossiers : dossiers?.data ?? [];
        router.push(list.length === 0 ? "/espace/dossier" : "/espace");
      } catch {
        router.push("/espace");
      }
      return;
    }
    router.push(defaultAdminRoute(role ?? "ADMIN"));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Champs requis", { description: "Renseignez votre e-mail et votre mot de passe." });
      return;
    }
    setLoading(true);
    setUnverifiedHint(false);
    setSuggestStudentPortal(false);

    const res = await signIn("credentials", {
      email,
      password,
      portal: authPortal,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      // NextAuth peut remonter EMAIL_NOT_VERIFIED comme message d'erreur
      const errMsg = String(res.error);
      if (isStudent && (errMsg.includes("EMAIL_NOT_VERIFIED") || errMsg === "EMAIL_NOT_VERIFIED")) {
        setUnverifiedHint(true);
        toast.error("E-mail non vérifié", {
          description: "Validez votre adresse avant de vous connecter.",
        });
        return;
      }
      if (!isStudent) {
        setSuggestStudentPortal(true);
      }
      toast.error("Connexion échouée", { description: "E-mail ou mot de passe incorrect." });
      return;
    }
    const sess = await fetch("/api/auth/session").then((r) => r.json());
    const role = sess?.user?.role as string | undefined;

    // Filet client : rôle incompatible avec l’onglet → pas de session utile
    const roleOk =
      (isStudent && role === "CANDIDAT") || (!isStudent && isStaff(role));
    if (!roleOk) {
      await signOut({ redirect: false });
      if (!isStudent) setSuggestStudentPortal(true);
      toast.error("Connexion échouée", { description: "E-mail ou mot de passe incorrect." });
      return;
    }

    toast.success("Connexion réussie", { description: `Bienvenue, ${sess?.user?.name}.` });
    await redirectAfterLogin(role);
  };

  const resendVerification = async () => {
    if (!email) {
      toast.error("Indiquez votre e-mail");
      return;
    }
    const r = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error("Envoi impossible", { description: data.error || "Réessayez." });
      return;
    }
    toast.success("E-mail renvoyé", {
      description: data.verifyUrl
        ? "Lien de vérification disponible (environnement de développement)."
        : "Consultez votre boîte mail.",
      action: data.verifyUrl
        ? { label: "Vérifier", onClick: () => window.open(data.verifyUrl, "_blank") }
        : undefined,
      duration: 12000,
    });
  };

  return (
    <div className="rounded-lg border border-ligne bg-blanc p-8 shadow-md">
      <Link href="/" className="mb-6 flex items-center justify-center">
        <BrandLogo height={52} priority className="object-center" />
      </Link>

      <Tabs
        value={portalTab}
        onValueChange={(v) => {
          setPortalTab(v as PortalTab);
          setUnverifiedHint(false);
          setSuggestStudentPortal(false);
        }}
        className="w-full"
      >
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1 bg-porcelaine p-1">
          <TabsTrigger
            value="etudiant"
            className="gap-1.5 py-2 data-[state=active]:bg-blanc data-[state=active]:text-encre data-[state=active]:shadow-sm"
          >
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Portail étudiant
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="gap-1.5 py-2 data-[state=active]:bg-blanc data-[state=active]:text-encre data-[state=active]:shadow-sm"
          >
            <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Back-office
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="eyebrow mb-2">{isStudent ? "Espace candidat" : "Accès équipe"}</p>
      <h1 className="font-display text-2xl font-bold text-encre">
        {isStudent ? "Bon retour parmi nous." : "Espace collaborateurs."}
      </h1>
      <p className="mt-1.5 text-sm text-ardoise">
        {isStudent
          ? "Connectez-vous pour suivre votre dossier d’admission."
          : "Réservé aux conseillers, finance et administrateurs."}
      </p>

      {unverifiedHint && isStudent && (
        <div className="mt-4 rounded-md border border-ambre/40 bg-ambre/5 p-3 text-sm text-ardoise">
          Votre e-mail n&apos;est pas encore vérifié.{" "}
          <button type="button" className="font-medium text-lapis underline" onClick={resendVerification}>
            Renvoyer le lien
          </button>
        </div>
      )}

      {suggestStudentPortal && !isStudent && (
        <div className="mt-4 rounded-md border border-ligne bg-porcelaine p-3 text-sm text-ardoise">
          Compte étudiant ?{" "}
          <button
            type="button"
            className="font-medium text-lapis underline"
            onClick={() => {
              setPortalTab("etudiant");
              setSuggestStudentPortal(false);
              setUnverifiedHint(false);
            }}
          >
            Accéder à l&apos;espace étudiant
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-encre">
            E-mail
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
              strokeWidth={1.5}
            />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              placeholder={isStudent ? "vous@exemple.com" : "prenom.nom@getadm.com"}
              autoComplete="email"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-encre">
              Mot de passe
            </Label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs font-medium text-lapis-clair hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
              strokeWidth={1.5}
            />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-lapis text-blanc hover:bg-lapis/90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion…
            </>
          ) : (
            <>
              Se connecter <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </form>

      {isStudent ? (
        <p className="mt-6 text-center text-sm text-ardoise">
          Pas encore de compte ?{" "}
          <Link
            href={
              callbackUrl
                ? `/inscription?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/inscription"
            }
            className="font-medium text-lapis-clair hover:underline"
          >
            Créer mon compte
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-ardoise">
          Compte provisionné par un administrateur — pas d&apos;inscription libre.
        </p>
      )}
    </div>
  );
}
