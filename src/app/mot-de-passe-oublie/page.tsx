"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { FieldError } from "@/components/ui/field-error";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [demoUrl, setDemoUrl] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError("L'e-mail est requis.");
      toast.error("E-mail requis");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("L'e-mail saisi n'est pas valide.");
      toast.error("E-mail invalide", { description: "Corrigez l'adresse indiquée." });
      return;
    }
    setEmailError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }
      setSent(true);
      if (data.resetUrl) setDemoUrl(data.resetUrl);
      toast.success("Demande envoyée", { description: "Vérifiez votre boîte de réception." });
    } catch (err) {
      toast.error("Échec", { description: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-ligne bg-blanc p-6 shadow-sm sm:p-8">
          <Link href="/" className="mb-6 flex items-center justify-center">
            <BrandLogo height={52} priority className="object-center" />
          </Link>

          {!sent ? (
            <>
              <p className="eyebrow mb-2">Mot de passe oublié</p>
              <h1 className="font-display text-2xl font-bold text-encre">Réinitialiser mon accès.</h1>
              <p className="mt-1.5 text-sm text-ardoise">
                Renseignez votre e-mail. Si un compte existe, vous recevrez un lien de réinitialisation.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-encre">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                      }}
                      className="pl-9"
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? "err-forgot-email" : undefined}
                    />
                  </div>
                  <FieldError id="err-forgot-email" message={emailError} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-lapis text-blanc hover:bg-lapis/90">
                  {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Envoyer le lien
                  {!loading && <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-vert/10">
                <CheckCircle2 className="h-6 w-6 text-vert" strokeWidth={1.5} />
              </div>
              <h1 className="font-display text-xl font-bold text-encre">Vérifiez votre boîte de réception.</h1>
              <p className="mt-2 text-sm text-ardoise">
                Si un compte existe pour <span className="font-mono text-encre">{email}</span>, un lien de réinitialisation a été envoyé.
              </p>
              {demoUrl && (
                <p className="mt-3 break-all rounded-md bg-porcelaine p-2 text-left text-xs text-lapis">
                  Lien démo :{" "}
                  <Link href={demoUrl} className="underline">
                    {demoUrl}
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-ligne pt-4">
            <Link href="/connexion?portal=etudiant" className="inline-flex items-center gap-1.5 text-sm font-medium text-lapis-clair hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
