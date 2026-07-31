"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Lien invalide");
      return;
    }
    if (password.length < 8) {
      toast.error("Mot de passe trop court", { description: "Minimum 8 caractères." });
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
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
      if (!res.ok) throw new Error(data.error || "Échec");
      setDone(true);
      toast.success("Mot de passe mis à jour");
      setTimeout(() => router.push("/connexion"), 2000);
    } catch (err) {
      toast.error("Échec", { description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-carmin">
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
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-vert" />
        <p className="mt-3 font-display text-lg font-bold text-encre">Mot de passe mis à jour</p>
        <p className="text-sm text-ardoise">Redirection vers la connexion…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" />
          <Input
            id="password"
            type="password"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmer</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-lapis text-blanc hover:bg-lapis/90">
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
