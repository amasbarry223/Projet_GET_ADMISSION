"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Mail, ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("E-mail invalide", { description: "L'e-mail saisi n'est pas valide." });
      return;
    }
    setSent(true);
    toast.success("Demande envoyée", { description: "Vérifiez votre boîte de réception." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
            <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-encre">GET Admission</span>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Le passage</span>
          </span>
        </Link>

        <div className="rounded-lg border border-ligne bg-blanc p-6 shadow-sm sm:p-8">
          {!sent ? (
            <>
              <p className="eyebrow mb-2">Mot de passe oublié</p>
              <h1 className="font-display text-2xl font-bold text-encre">Réinitialiser mon accès.</h1>
              <p className="mt-1.5 text-sm text-ardoise">
                Renseignez votre e-mail. Si un compte existe, vous recevrez un lien de réinitialisation.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-encre">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="vous@exemple.com" autoComplete="email" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-lapis text-blanc hover:bg-lapis/90">
                  Envoyer le lien
                  <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
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
            </div>
          )}

          <div className="mt-6 border-t border-ligne pt-4">
            <Link href="/connexion" className="inline-flex items-center gap-1.5 text-sm font-medium text-lapis-clair hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
