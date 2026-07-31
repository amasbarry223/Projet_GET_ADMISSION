"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Info, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";

function Content() {
  const params = useSearchParams();
  const status = params.get("status") || "error";
  const message =
    params.get("message") ||
    (status === "pending"
      ? "Consultez votre boîte mail pour activer votre compte."
      : "Une erreur est survenue.");
  const email = params.get("email") || "";
  const verifyUrl = params.get("verifyUrl") || "";
  const callbackUrl = params.get("callbackUrl") || "";
  const [resending, setResending] = React.useState(false);

  const cfg =
    status === "ok"
      ? { icon: CheckCircle2, color: "text-vert", bg: "bg-vert/10", title: "E-mail vérifié" }
      : status === "already"
        ? { icon: Info, color: "text-lapis", bg: "bg-lapis/10", title: "Déjà vérifié" }
        : status === "pending"
          ? { icon: Mail, color: "text-lapis", bg: "bg-lapis/10", title: "Vérifiez votre e-mail" }
          : { icon: XCircle, color: "text-carmin", bg: "bg-carmin/10", title: "Vérification échouée" };

  const Icon = cfg.icon;
  const loginHref = callbackUrl
    ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/connexion";

  const resend = async () => {
    if (!email) {
      toast.error("E-mail manquant");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Envoi impossible", { description: data.error || "Réessayez." });
        return;
      }
      toast.success("E-mail renvoyé", {
        description: data.verifyUrl ? "Lien de vérification disponible (environnement de développement)." : "Consultez votre boîte mail.",
        action: data.verifyUrl
          ? { label: "Vérifier", onClick: () => window.open(data.verifyUrl, "_blank") }
          : undefined,
        duration: 12000,
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-lg border border-ligne bg-blanc p-6 text-center shadow-sm sm:p-8">
      <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${cfg.bg}`}>
        <Icon className={`h-6 w-6 ${cfg.color}`} strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-xl font-bold text-encre">{cfg.title}</h1>
      <p className="mt-2 text-sm text-ardoise">{message}</p>
      {email && status === "pending" && (
        <p className="mt-1 font-mono text-xs text-lapis">{email}</p>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {status === "pending" && verifyUrl && (
          <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
            <a href={verifyUrl}>Vérifier maintenant</a>
          </Button>
        )}
        {(status === "ok" || status === "already") && (
          <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href={loginHref}>Se connecter</Link>
          </Button>
        )}
        {(status === "pending" || status === "error") && email && (
          <Button variant="outline" onClick={resend} disabled={resending}>
            {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Renvoyer l&apos;e-mail
          </Button>
        )}
        {status === "error" && !email && (
          <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href="/inscription">Retour à l&apos;inscription</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerificationEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <BrandLogo height={56} priority />
        </Link>
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-ardoise" />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}
