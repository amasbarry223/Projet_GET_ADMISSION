"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { defaultAdminRoute } from "@/lib/rbac";

export default function VerificationOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ardoise" />
        </div>
      }
    >
      <VerificationOtpInner />
    </Suspense>
  );
}

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function VerificationOtpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").toLowerCase().trim();
  const mode = searchParams.get("mode") === "register" ? "register" : "login";
  const prenom = searchParams.get("prenom") || "";
  const nom = searchParams.get("nom") || "";
  const nationalite = searchParams.get("nationalite") || "";
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  const redirectAfterLogin = async (role: string | undefined) => {
    if (role === "CANDIDAT") {
      if (callbackUrl === "/espace" || callbackUrl?.startsWith("/espace/")) {
        router.push(callbackUrl);
        return;
      }
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

  const completeAuth = async (token: string) => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error || !data.session?.access_token) {
        toast.error("Code invalide", {
          description: error?.message || "Vérifiez le code et réessayez.",
        });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: data.session.access_token,
          mode,
          prenom: prenom || undefined,
          nom: nom || undefined,
          nationalite: nationalite || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        toast.error("Vérification échouée", {
          description: payload.error || "Réessayez.",
        });
        setLoading(false);
        return;
      }

      const sign = await signIn("credentials", {
        bridgeToken: payload.bridgeToken,
        redirect: false,
      });

      if (sign?.error) {
        toast.error("Session impossible", {
          description: "Le code est valide mais la connexion a échoué. Réessayez.",
        });
        setLoading(false);
        return;
      }

      await supabase.auth.signOut().catch(() => undefined);

      toast.success("Compte activé", {
        description: `Bienvenue${payload.user?.prenom ? `, ${payload.user.prenom}` : ""}.`,
      });
      await redirectAfterLogin(payload.user?.role);
    } catch {
      toast.error("Erreur", { description: "Une erreur est survenue. Réessayez." });
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("E-mail manquant", { description: "Recommencez depuis l'inscription." });
      return;
    }
    if (otp.length !== 6) {
      toast.error("Code incomplet", { description: "Saisissez les 6 chiffres." });
      return;
    }
    await completeAuth(otp);
  };

  const resend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.emailSent === false) {
        toast.error("Renvoi impossible", {
          description: data.error || "Réessayez dans une minute.",
        });
      } else {
        toast.success("Nouveau code envoyé", {
          description: "Consultez votre boîte mail.",
        });
      }
    } catch {
      toast.error("Erreur", { description: "Impossible de renvoyer le code." });
    }
    setResending(false);
  };

  if (!email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <BrandLogo height={48} />
        <p className="text-sm text-ardoise">Session OTP invalide.</p>
        <Button asChild variant="outline">
          <Link href="/inscription">Retour à l&apos;inscription</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelaine p-6">
      <div className="w-full max-w-md rounded-lg border border-ligne bg-blanc p-8 shadow-md">
        <Link href="/" className="mb-6 flex justify-center">
          <BrandLogo height={48} priority />
        </Link>

        <p className="eyebrow mb-2">Activation</p>
        <h1 className="font-display text-2xl font-bold text-encre">
          Activez votre compte.
        </h1>
        <p className="mt-2 text-sm text-ardoise">
          Un e-mail a été envoyé à{" "}
          <span className="font-medium text-encre">{email}</span>.
          Saisissez le code à 6 chiffres s&apos;il apparaît, ou{" "}
          <strong className="font-medium text-encre">cliquez sur le lien</strong>{" "}
          dans le message pour activer votre compte.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-encre">Code OTP</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-11 w-11 text-base" />
                  <InputOTPSlot index={1} className="h-11 w-11 text-base" />
                  <InputOTPSlot index={2} className="h-11 w-11 text-base" />
                  <InputOTPSlot index={3} className="h-11 w-11 text-base" />
                  <InputOTPSlot index={4} className="h-11 w-11 text-base" />
                  <InputOTPSlot index={5} className="h-11 w-11 text-base" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-lapis text-blanc hover:bg-lapis/90"
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification…
              </>
            ) : (
              <>
                Valider <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-ardoise">
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 font-medium text-lapis-clair hover:underline disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            Renvoyer le code
          </button>
          <Link
            href={mode === "register" ? "/inscription" : "/connexion"}
            className="text-ardoise hover:underline"
          >
            Retour
          </Link>
        </div>
      </div>
    </div>
  );
}
