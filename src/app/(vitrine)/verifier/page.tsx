"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, Search, XCircle } from "lucide-react";

function VerifierForm() {
  const params = useSearchParams();
  const [code, setCode] = React.useState(params.get("code") || "");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const verify = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/verifier?code=${encodeURIComponent(c.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.valide) {
        setError(data.error || "Code invalide");
        return;
      }
      setResult(data);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const initial = params.get("code");
    if (initial) verify(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="eyebrow mb-2">Authenticité</p>
        <h1 className="font-display text-3xl font-bold text-encre">Vérifier une attestation</h1>
        <p className="mt-2 text-sm text-ardoise">
          Saisissez le code de vérification figurant sur l&apos;attestation de pré-inscription.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="code" className="sr-only">
            Code
          </Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VRF-XXXX-XXXX-0000"
            className="font-mono"
          />
        </div>
        <Button type="submit" disabled={loading} className="bg-lapis text-blanc hover:bg-lapis/90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {error && (
        <Card className="flex items-start gap-3 border-carmin/30 bg-carmin/5 p-4">
          <XCircle className="h-5 w-5 text-carmin" />
          <div>
            <p className="font-medium text-encre">Attestation non valide</p>
            <p className="text-sm text-ardoise">{error}</p>
          </div>
        </Card>
      )}

      {result && (
        <Card className="border-vert/30 bg-vert/5 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-vert" />
            <Badge className="bg-vert/15 font-mono text-[10px] uppercase text-vert">Authentique</Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Référence</dt>
              <dd className="font-mono font-medium text-encre">{String(result.reference)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Candidat</dt>
              <dd className="font-medium text-encre">{String(result.candidat)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Université</dt>
              <dd className="text-right font-medium text-encre">{String(result.universite)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Formation</dt>
              <dd className="text-right text-encre">{String(result.formation)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ardoise">Émise le</dt>
              <dd className="font-mono text-encre">{String(result.dateEmissionLabel)}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}

export default function VerifierPage() {
  return (
    <div className="min-h-[60vh] px-4 py-16 sm:px-6">
      <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-ardoise" />}>
        <VerifierForm />
      </Suspense>
    </div>
  );
}
