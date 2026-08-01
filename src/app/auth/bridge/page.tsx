"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function BridgeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bridgeToken = searchParams.get("bridgeToken");
  const next = searchParams.get("next") || "/espace";

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bridgeToken) {
        router.replace("/connexion?error=bridge");
        return;
      }
      const res = await signIn("credentials", {
        bridgeToken,
        redirect: false,
      });
      if (cancelled) return;
      if (res?.error) {
        toast.error("Connexion impossible", {
          description: "Le lien a expiré. Demandez un nouveau code.",
        });
        router.replace("/connexion");
        return;
      }
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      toast.success("Connexion réussie");
      const dest =
        next.startsWith("/") && !next.startsWith("//") ? next : "/espace";
      router.replace(dest);
    })();
    return () => {
      cancelled = true;
    };
  }, [bridgeToken, next, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-ardoise" />
      <p className="text-sm text-ardoise">Finalisation de la connexion…</p>
    </div>
  );
}

export default function AuthBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ardoise" />
        </div>
      }
    >
      <BridgeInner />
    </Suspense>
  );
}
