"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { FieldError } from "@/components/ui/field-error";
import { toastApiErrorSync } from "@/lib/toast-api";

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastApiErrorSync(res.status, { title: "Envoi impossible", body: data });
        return;
      }
      setSent(true);
      if (data.resetUrl) setDemoUrl(data.resetUrl);
      toast.success("Demande envoyée", { description: "Vérifiez votre boîte de réception." });
    } catch (err) {
      toastApiErrorSync(err, { title: "Envoi impossible" });
    } finally {
      setLoading(false);
    }
  };

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
      <div className="absolute inset-0 bg-encre/75" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-br from-lapis/20 via-transparent to-or/10"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-[26rem]">
        <div className="overflow-hidden rounded-xl border border-blanc/15 bg-blanc shadow-[0_24px_64px_-20px_rgba(0,0,0,0.55)]">
          <div className="h-1 w-full bg-gradient-to-r from-or via-lapis to-or/40" aria-hidden />

          <div className="p-8 sm:p-9">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis"
              >
                <BrandLogo height={44} priority className="object-left" />
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-ligne bg-porcelaine px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ardoise">
                <KeyRound className="h-3 w-3 text-lapis" strokeWidth={2} aria-hidden />
                Accès
              </span>
            </div>

            {!sent ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-or">Sécurité</p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-encre">
                  Mot de passe oublié.
                </h1>
                <p className="mt-1.5 text-sm text-ardoise">
                  Indiquez votre e-mail. Si un compte existe, vous recevrez un lien de réinitialisation.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email" className="text-sm font-medium text-encre">
                      Adresse e-mail
                    </Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                        strokeWidth={1.5}
                      />
                      <Input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError(null);
                        }}
                        className="h-11 rounded-lg border-ligne bg-porcelaine/40 pl-9 focus-visible:bg-blanc"
                        placeholder="vous@exemple.com"
                        autoComplete="email"
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "err-forgot-email" : undefined}
                      />
                    </div>
                    <FieldError id="err-forgot-email" message={emailError} />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 min-h-11 w-full rounded-lg bg-encre text-blanc hover:bg-lapis"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…
                      </>
                    ) : (
                      <>
                        Envoyer le lien
                        <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-vert/10">
                  <CheckCircle2 className="h-7 w-7 text-vert" strokeWidth={1.5} />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-or">Envoyé</p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-encre">
                  Vérifiez votre boîte.
                </h1>
                <p className="mt-1.5 text-sm text-ardoise">
                  Si un compte existe pour{" "}
                  <span className="font-mono font-medium text-encre">{email.trim()}</span>, un lien
                  de réinitialisation a été envoyé.
                </p>
                {demoUrl && (
                  <p className="mt-4 break-all rounded-lg border border-ligne bg-porcelaine/60 p-3 text-left text-xs text-lapis">
                    Lien démo :{" "}
                    <Link href={demoUrl} className="font-medium underline underline-offset-2">
                      {demoUrl}
                    </Link>
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-ligne pt-5 space-y-2">
              <p className="text-center text-sm">
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-1.5 font-medium text-encre underline-offset-4 hover:text-lapis hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Retour à la connexion candidat
                </Link>
              </p>
              <p className="text-center text-xs text-ardoise">
                Collaborateur ?{" "}
                <Link href="/back-office" className="font-medium text-encre underline-offset-4 hover:text-lapis hover:underline">
                  Accès back-office
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
