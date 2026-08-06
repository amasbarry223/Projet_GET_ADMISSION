import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BedDouble, ExternalLink } from "lucide-react";

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSecx02kR5CwgLnEBeDyp6ydEQreNNlctW_hewOBY-bxW8Nqlg/viewform";

// "embedded=true" retire l'en-tête Google du formulaire dans l'iframe (recommandation Google Forms).
const GOOGLE_FORM_EMBED_URL = `${GOOGLE_FORM_URL}?embedded=true`;

export default function LogementPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Réservation de logement</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Réservez votre logement étudiant.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ardoise">
          Remplissez le formulaire ci-dessous pour soumettre votre demande de logement. Votre
          conseiller vous recontactera pour finaliser la réservation.
        </p>
      </div>

      <Card className="overflow-hidden border-ligne bg-blanc p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ligne bg-porcelaine px-6 py-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
            Formulaire de réservation de logement
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Ouvrir dans un nouvel onglet
            </a>
          </Button>
        </div>
        <div className="h-[900px] w-full bg-porcelaine sm:h-[1000px] lg:h-[1200px]">
          <iframe
            src={GOOGLE_FORM_EMBED_URL}
            title="Formulaire de réservation de logement"
            className="h-full w-full border-0"
            loading="lazy"
          >
            Chargement du formulaire…
          </iframe>
        </div>
      </Card>

      <p className="text-xs text-ardoise">
        Le formulaire ne s&apos;affiche pas ? Utilisez le bouton « Ouvrir dans un nouvel onglet »
        ci-dessus pour le remplir directement sur Google Forms.
      </p>
    </div>
  );
}
