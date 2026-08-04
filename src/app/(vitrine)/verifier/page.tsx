"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field-error";
import { ShieldCheck, Loader2, Search, XCircle } from "lucide-react";
import { getApiErrorMessageSync } from "@/lib/api-error";

function VerifierForm() {
  const params = useSearchParams();
  const [code, setCode] = React.useState(params.get("code") || "");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const verify = async (c: string) => {
    if (!c.trim()) {
      setFieldError("Saisissez le code figurant sur l'attestation.");
      setError(null);
      setResult(null);
      document.getElementById("code")?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setFieldError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/verifier?code=${encodeURIComponent(c.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valide) {
        setError(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : getApiErrorMessageSync(res.status, data, "Ce code ne correspond à aucune attestation."),
        );
        return;
      }
      setResult(data);
    } catch (e) {
      setError(
        getApiErrorMessageSync(e, undefined, "Connexion impossible. Vérifiez votre réseau et réessayez."),
      );
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const initial = params.get("code");
    if (!initial) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void verify(initial);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="eyebrow mb-2">Authenticité</p>
        <h1 className="font-display text-3xl font-bold text-foreground">Vérifier une attestation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisissez le code de vérification figurant sur l&apos;attestation de pré-inscription.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
        noValidate
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="code" className="sr-only">
            Code de vérification
          </Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setFieldError(null);
            }}
            placeholder="VRF-XXXX-XXXX-0000"
            className="font-mono"
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? "err-verifier-code" : undefined}
            autoComplete="off"
          />
          <FieldError id="err-verifier-code" message={fieldError} />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="min-h-11 min-w-11 bg-primary text-blanc hover:bg-primary/90"
          aria-label={loading ? "Vérification en cours" : "Vérifier le code"}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      <div aria-live="polite" aria-atomic="true" className="space-y-4">
        {error && (
          <Card className="flex items-start gap-3 border-carmin/30 bg-carmin/5 p-4" role="alert">
            <XCircle className="h-5 w-5 flex-none text-carmin" />
            <div>
              <p className="font-medium text-foreground">Attestation non valide</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </Card>
        )}

        {result && (
          <Card className="border-vert/30 bg-vert/5 p-6" role="status">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-vert" />
              <Badge className="bg-vert/15 font-mono text-[10px] uppercase text-vert">Authentique</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Référence</dt>
                <dd className="font-mono font-medium text-foreground">{String(result.reference)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Candidat</dt>
                <dd className="font-medium text-foreground">{String(result.candidat)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Université</dt>
                <dd className="text-right font-medium text-foreground">{String(result.universite)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Formation</dt>
                <dd className="text-right text-foreground">{String(result.formation)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Émise le</dt>
                <dd className="font-mono text-foreground">{String(result.dateEmissionLabel)}</dd>
              </div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function VerifierPage() {
  return (
    <div className="min-h-[60vh] px-4 py-16 sm:px-6">
      <div className="glass-card mx-auto max-w-lg rounded-xl p-6 shadow-lg sm:p-8">
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}>
          <VerifierForm />
        </Suspense>
      </div>
    </div>
  );
}
