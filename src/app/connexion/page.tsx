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
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { FieldError } from "@/components/ui/field-error";

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function candidatCallback(callbackUrl: string | null): string | null {
  if (!callbackUrl) return null;
  if (callbackUrl === "/espace" || callbackUrl.startsWith("/espace/")) return callbackUrl;
  return null;
}

/** Anciens liens staff → page dédiée /back-office */
function shouldRedirectToBackOffice(
  portal: string | null,
  callbackUrl: string | null,
): boolean {
  if (portal === "staff" || portal === "backoffice") return true;
  if (callbackUrl === "/admin" || callbackUrl?.startsWith("/admin/")) return true;
  return false;
}

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

function ConnexionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

  React.useEffect(() => {
    if (!shouldRedirectToBackOffice(portal, callbackUrl)) return;
    const params = new URLSearchParams();
    if (callbackUrl === "/admin" || callbackUrl?.startsWith("/admin/")) {
      params.set("callbackUrl", callbackUrl);
    }
    const qs = params.toString();
    router.replace(qs ? `/back-office?${qs}` : "/back-office");
  }, [portal, callbackUrl, router]);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({});

  if (shouldRedirectToBackOffice(portal, callbackUrl)) {
    return (
      <div className="flex justify-center rounded-lg border border-ligne bg-blanc p-10">
        <Loader2 className="h-6 w-6 animate-spin text-lapis" />
      </div>
    );
  }

  const redirectAfterLogin = async () => {
    const allowedCallback = candidatCallback(callbackUrl);
    if (allowedCallback) {
      router.push(allowedCallback);
      return;
    }
    try {
      const dossiers = await fetch("/api/dossiers").then((r) => (r.ok ? r.json() : []));
      const list = Array.isArray(dossiers) ? dossiers : dossiers?.data ?? [];
      router.push(list.length === 0 ? "/espace/dossier" : "/espace");
    } catch {
      router.push("/espace");
    }
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

    const res = await signIn("credentials", {
      email,
      password,
      portal: "candidat",
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      toast.error("Connexion échouée", {
        description:
          "E-mail ou mot de passe incorrect. Si vous venez de vous inscrire, activez d’abord votre compte via le code reçu par e-mail.",
      });
      return;
    }
    const sess = await fetch("/api/auth/session").then((r) => r.json());
    const role = sess?.user?.role as string | undefined;

    if (role !== "CANDIDAT") {
      await signOut({ redirect: false });
      toast.error("Connexion échouée", {
        description:
          "Ce compte n’est pas un compte candidat. Utilisez l’accès collaborateurs.",
      });
      return;
    }

    toast.success("Connexion réussie", { description: `Bienvenue, ${sess?.user?.name}.` });
    await redirectAfterLogin();
  };

  return (
    <div className="rounded-lg border border-ligne bg-blanc p-8 shadow-md">
      <Link href="/" className="mb-6 flex items-center justify-center">
        <BrandLogo height={52} priority className="object-center" />
      </Link>

      <p className="eyebrow mb-2">Espace candidat</p>
      <h1 className="font-display text-2xl font-bold text-encre">Bon retour parmi nous.</h1>
      <p className="mt-1.5 text-sm text-ardoise">
        Connectez-vous avec votre e-mail et mot de passe.
      </p>

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
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className="pl-9"
              placeholder="vous@exemple.com"
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "err-login-email" : undefined}
            />
          </div>
          <FieldError id="err-login-email" message={fieldErrors.email} />
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
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className="pl-9"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "err-login-password" : undefined}
            />
          </div>
          <FieldError id="err-login-password" message={fieldErrors.password} />
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
    </div>
  );
}
