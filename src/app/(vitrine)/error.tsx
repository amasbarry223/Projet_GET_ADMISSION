"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VitrineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-porcelaine px-6 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-carmin/10">
          <AlertTriangle className="h-7 w-7 text-carmin" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-2xl font-bold text-encre">Impossible d&apos;afficher cette page.</h1>
        <p className="mt-2 text-sm text-ardoise">
          Une erreur est survenue. Vos données ne sont pas affectées — réessayez ou revenez à l&apos;accueil.
        </p>
        {isDev && error?.message ? (
          <p className="mt-3 rounded-md border border-ligne bg-blanc px-3 py-2 font-mono text-left text-xs text-carmin">
            {error.message}
          </p>
        ) : error?.digest ? (
          <p className="mt-3 font-mono text-[10px] text-ardoise">Réf. {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} size="sm" className="bg-lapis text-blanc hover:bg-lapis/90">
            <RotateCcw className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Réessayer
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              Accueil <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
