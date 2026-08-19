"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, Loader2, Shield, Eye, EyeOff, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { FieldError } from "@/components/ui/field-error";
import { defaultAdminRoute, isStaff } from "@/lib/rbac";
import { staffSignIn, staffSignOut } from "@/lib/auth-staff-client";

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function adminCallback(callbackUrl: string | null): string | null {
  if (!callbackUrl) return null;
  if (callbackUrl === "/admin" || callbackUrl.startsWith("/admin/")) return callbackUrl;
  return null;
}

export default function BackOfficeLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <Image
        src="/images/campus-sorbonne.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        aria-hidden
      />
      {/* Overlay plus institutionnel : encre + légère teinte lapis */}
      <div className="absolute inset-0 bg-encre/75" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-br from-lapis/20 via-transparent to-or/10"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-[26rem]">
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-blanc" />}>
          <BackOfficeLoginInner />
        </Suspense>
      </div>
    </div>
  );
}

function BackOfficeLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestCandidat, setSuggestCandidat] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({});

  const redirectAfterLogin = (role: string | undefined) => {
    const allowed = adminCallback(callbackUrl);
    if (allowed) {
      router.push(allowed);
      return;
    }
    router.push(defaultAdminRoute(role ?? "ADMIN"));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "L'e-mail est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Indiquez une adresse e-mail valide.";
    }
    if (!password) errs.password = "Le mot de passe est requis.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Champs requis", { description: "Corrigez les champs indiqués." });
      return;
    }
    setLoading(true);
    setSuggestCandidat(false);

    const res = await staffSignIn({ email, password, portal: "staff" });

    setLoading(false);
    if (res?.error) {
      const suspendedFromAuth =
        res.error === "ACCOUNT_SUSPENDED" || res.error.includes("ACCOUNT_SUSPENDED");

      let suspended = suspendedFromAuth;
      if (!suspended) {
        try {
          const diagnose = await fetch("/api/auth/staff-login-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          }).then((r) => r.json() as Promise<{ status?: string }>);
          suspended = diagnose?.status === "suspended";
        } catch {
          // ignore — repli sur message générique
        }
      }

      if (suspended) {
        toast.error("Compte suspendu", {
          description:
            "Votre accès au back-office a été suspendu. Contactez un super-administrateur pour le réactiver.",
        });
        return;
      }

      setSuggestCandidat(true);
      toast.error("Connexion échouée", {
        description: "E-mail ou mot de passe incorrect.",
      });
      return;
    }

    const sess = await fetch("/api/auth/staff/session").then((r) => r.json());
    const role = sess?.user?.role as string | undefined;

    if (!isStaff(role)) {
      await staffSignOut({ redirect: false });
      setSuggestCandidat(true);
      toast.error("Connexion échouée", {
        description: "E-mail ou mot de passe incorrect.",
      });
      return;
    }

    toast.success("Connexion réussie", {
      description: `Bienvenue, ${sess?.user?.name ?? "collaborateur"}.`,
    });
    redirectAfterLogin(role);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-blanc/15 bg-blanc shadow-[0_24px_64px_-20px_rgba(0,0,0,0.55)]">
      {/* Bandeau or — signature agence (absent du login candidat) */}
      <div className="h-1 w-full bg-gradient-to-r from-or via-lapis to-or/40" aria-hidden />

      <div className="p-8 sm:p-9">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Retour à l'accueil — GET Admission"
            className="inline-flex rounded-md opacity-90 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis"
          >
            <BrandLogo height={44} priority className="object-left" />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-ligne bg-porcelaine px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ardoise">
            <Shield className="h-3 w-3 text-lapis" strokeWidth={2} aria-hidden />
            Staff
          </span>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-or">Back-office</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-encre">
          Accès collaborateurs.
        </h1>
        <p className="mt-1.5 text-sm text-ardoise">
          Conseillers, finance et administrateurs — session sécurisée.
        </p>

        {suggestCandidat && (
          <div className="mt-4 rounded-md border border-ambre/30 bg-ambre/5 p-3 text-sm text-ardoise">
            Compte étudiant ?{" "}
            <Link href="/connexion" className="font-medium text-lapis underline">
              Accéder à l&apos;espace candidat
            </Link>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="bo-email" className="text-sm font-medium text-encre">
              E-mail professionnel
            </Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                strokeWidth={1.5}
              />
              <Input
                id="bo-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => {
                    const { email: _, ...rest } = prev;
                    return rest;
                  });
                }}
                className="h-11 rounded-lg border-ligne bg-porcelaine/40 pl-9 focus-visible:bg-blanc"
                placeholder="prenom.nom@getadm.com"
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "err-bo-email" : undefined}
              />
            </div>
            <FieldError id="err-bo-email" message={fieldErrors.email} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bo-password" className="text-sm font-medium text-encre">
                Mot de passe
              </Label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs font-medium text-lapis hover:underline"
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
                id="bo-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => {
                    const { password: _, ...rest } = prev;
                    return rest;
                  });
                }}
                className="h-11 rounded-lg border-ligne bg-porcelaine/40 pl-9 pr-10 focus-visible:bg-blanc"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "err-bo-password" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ardoise hover:text-encre focus:outline-none"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
            <FieldError id="err-bo-password" message={fieldErrors.password} />
          </div>

          <Button
            type="submit"
            className="h-11 min-h-11 w-full rounded-lg bg-encre text-blanc hover:bg-lapis"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion…
              </>
            ) : (
              <>
                Entrer dans l&apos;agence{" "}
                <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-ligne pt-5">
          <p className="text-center text-xs text-ardoise">
            Accès provisionné — pas d&apos;inscription libre.
          </p>
          <div className="mt-3 flex justify-center">
            <Link
              href="/connexion"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ligne bg-porcelaine/60 px-4 py-2 text-sm font-medium text-encre transition-colors hover:border-lapis/30 hover:bg-lapis/5 hover:text-lapis"
            >
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Espace candidat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
