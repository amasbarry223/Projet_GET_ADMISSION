"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-carmin/10">
          <AlertTriangle className="h-7 w-7 text-carmin" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-xl font-bold text-encre">Erreur dans votre espace.</h1>
        <p className="mt-2 text-sm text-ardoise">
          Une erreur est survenue lors du chargement de cette page. Vos données sont intactes — réessayez ou revenez au tableau de bord.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} size="sm" className="bg-lapis text-blanc hover:bg-lapis/90">
            <RotateCcw className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Réessayer
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/espace">Tableau de bord <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
