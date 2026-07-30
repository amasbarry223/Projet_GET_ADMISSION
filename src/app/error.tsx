"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-porcelaine p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-carmin/10">
          <AlertTriangle className="h-7 w-7 text-carmin" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-2xl font-bold text-encre">Une erreur est survenue.</h1>
        <p className="mt-2 text-ardoise">
          Une erreur inattendue s'est produite. Vous pouvez réessayer ou revenir à l'accueil.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-lapis px-5 py-2.5 text-sm font-medium text-blanc transition-colors hover:bg-lapis/90"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-ligne bg-blanc px-5 py-2.5 text-sm font-medium text-encre transition-colors hover:bg-porcelaine"
          >
            Accueil <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
