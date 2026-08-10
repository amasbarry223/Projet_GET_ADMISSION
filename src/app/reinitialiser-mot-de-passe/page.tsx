"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toastApiErrorSync, toastApiSuccess } from "@/lib/toast-api";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<{
    password?: string;
    confirm?: string;
  }>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toastApiErrorSync(new Error("Demandez un nouveau lien depuis « mot de passe oublié »."), {
        title: "Lien invalide",
      });
      return;
    }
    const errs: { password?: string; confirm?: string } = {};
    if (password.length < 8) {
      errs.password = "Minimum 8 caractères.";
    }
    if (password !== confirm) {
      errs.confirm = "Les mots de passe ne correspondent pas.";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      toastApiErrorSync(new Error("Corrigez les champs indiqués."), {
        title: "Formulaire incomplet",
      });
      const first = errs.password ? "password" : "confirm";
      document.getElementById(first)?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastApiErrorSync(res.status, {
          title: "Mise à jour impossible",
          body: data,
        });
        return;
      }
      setDone(true);
      toastApiSuccess("Mot de passe mis à jour", "Redirection vers la connexion…");
      setTimeout(() => router.push("/connexion"), 2000);
    } catch (err) {
      toastApiErrorSync(err, { title: "Mise à jour impossible" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-carmin" role="alert">
        Lien manquant. Demandez un nouveau lien depuis{" "}
        <Link href="/mot-de-passe-oublie" className="underline">
          mot de passe oublié
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-vert" />
        <p className="mt-3 font-display text-lg font-bold text-encre">Mot de passe mis à jour</p>
        <p className="text-sm text-ardoise">Redirection vers la connexion…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            className="pl-9 pr-10"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => {
                const { password: _, ...rest } = prev;
                return rest;
              });
            }}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "err-reset-password" : undefined}
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
        <FieldError id="err-reset-password" message={fieldErrors.password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmer</Label>
        <div className="relative">
          <Input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            className="pr-10"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setFieldErrors((prev) => {
                const { confirm: _, ...rest } = prev;
                return rest;
              });
            }}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.confirm}
            aria-describedby={fieldErrors.confirm ? "err-reset-confirm" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ardoise hover:text-encre focus:outline-none"
            aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
        <FieldError id="err-reset-confirm" message={fieldErrors.confirm} />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="min-h-11 w-full bg-lapis text-blanc hover:bg-lapis/90"
      >
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Enregistrer
        {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
      </Button>
    </form>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <BrandLogo height={56} priority />
        </Link>
        <div className="rounded-lg border border-ligne bg-blanc p-6 shadow-sm sm:p-8">
          <p className="eyebrow mb-2">Sécurité</p>
          <h1 className="font-display text-2xl font-bold text-encre">Nouveau mot de passe</h1>
          <div className="mt-6">
            <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-ardoise" />}>
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
