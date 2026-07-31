import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { BrandLogo } from "@/components/brand-logo";

const COLONNES = [
  {
    titre: "Plateforme",
    liens: [
      { href: "/universites", label: "Universités partenaires" },
      { href: "/inscription", label: "Créer mon dossier" },
      { href: "/connexion?portal=etudiant", label: "Espace candidat" },
      { href: "/faq", label: "Questions fréquentes" },
    ],
  },
  {
    titre: "Ressources",
    liens: [
      { href: "/a-propos", label: "À propos de GET Admission" },
      { href: "/faq", label: "Comment ça marche" },
      { href: "/contact", label: "Nous contacter" },
      { href: "/universites", label: "Catalogue des formations" },
    ],
  },
  {
    titre: "Légal",
    liens: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/mentions-legales", label: "Politique de confidentialité" },
      { href: "/verifier", label: "Vérifier une attestation" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export async function SiteFooter() {
  const info = await db.contactInfo.findUnique({ where: { id: 1 } });
  const email = info?.email ?? "";
  const telephone = info?.telephone ?? "";
  const adresses = info?.adresses ?? "";

  return (
    <footer className="mt-auto border-t border-ligne bg-blanc">
      <div className="rule-or" aria-hidden />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex" aria-label="Accueil GET Admission">
              <BrandLogo height={48} />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ardoise">
              Agence d'admission universitaire. Nous accompagnons les étudiants d'Afrique de l'Ouest vers leurs universités partenaires à l'étranger.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ardoise">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                <span>{email || "—"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                <span>{telephone || "—"}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                <span>{adresses || "—"}</span>
              </li>
            </ul>
          </div>

          {COLONNES.map((col) => (
            <nav key={col.titre} aria-label={col.titre}>
              <p className="font-mono text-[11px] uppercase tracking-eyebrow text-ardoise">{col.titre}</p>
              <ul className="mt-4 space-y-2.5">
                {col.liens.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-encre/80 hover:text-lapis transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ligne pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ardoise">
            <span className="font-mono uppercase tracking-eyebrow">Confidentiel — GET Admission</span> · Plateforme de démonstration.
          </p>
          <p className="text-xs text-ardoise">
            © {new Date().getFullYear()} GET Admission. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
