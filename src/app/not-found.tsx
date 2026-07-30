import Link from "next/link";
import { Plane, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-porcelaine p-6">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
          <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
        </span>
        <span className="font-display text-base font-bold text-encre">GET Admission</span>
      </Link>
      <div className="max-w-md text-center">
        <p className="font-mono text-[12px] uppercase tracking-eyebrow text-lapis">Erreur 404</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-encre">Page introuvable.</h1>
        <p className="mt-3 text-ardoise">
          La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou revenez à l'accueil.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-lapis px-5 py-2.5 text-sm font-medium text-blanc transition-colors hover:bg-lapis/90"
        >
          Retour à l'accueil <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
