import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle, MessageCircleQuestion } from "lucide-react";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Eyebrow, Reveal } from "@/components/site/reveal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Foire Aux Questions (FAQ) — GET Admission",
  description:
    "Trouvez les réponses à toutes vos questions sur les démarches d'admission universitaire avec GET Admission, les frais d'agence fixes, les pièces académiques, les délais et le logement CROUS.",
  alternates: {
    canonical: "https://get-admission.com/faq",
  },
  openGraph: {
    title: "FAQ — GET Admission",
    description:
      "Tout ce qu'il faut savoir sur GET Admission, nos frais, nos délais et le suivi de votre dossier d'admission.",
    url: "https://get-admission.com/faq",
    type: "website",
  },
};

const DEFAULT_FAQS = [
  {
    id: 1,
    question: "Comment fonctionne l'accompagnement GET Admission ?",
    reponse:
      "GET Admission est votre passerelle officielle vers les universités internationales. Vous créez votre compte en quelques clics, choisissez votre formation parmi nos établissements partenaires, téléversez vos pièces académiques et réglez les frais d'agence. Votre conseiller dédié vérifie et optimise votre dossier, le transmet à l'université et vous délivre votre attestation officielle de pré-inscription reconnue pour Campus France et le visa.",
  },
  {
    id: 2,
    question: "Dois-je passer par Campus France si j'obtiens une pré-admission avec GET Admission ?",
    reponse:
      "Oui, pour les pays adhérents au dispositif Études en France (Sénégal, Côte d'Ivoire, Cameroun, Guinée, Mali, Gabon, Congo, etc.), la procédure Campus France reste obligatoire. Cependant, grâce à l'attestation de pré-inscription officielle fournie par GET Admission, vous êtes dispensé de la phase de candidature standard et accédez directement à la procédure 'Je suis accepté', ce qui simplifie grandement vos démarches et accélère votre entretien.",
  },
  {
    id: 3,
    question: "Quels sont les frais d'agence et comment sont-ils calculés ?",
    reponse:
      "Nos frais d'agence sont forfaitaires, clairs et sans frais cachés : 65 000 FCFA pour une admission en université publique et 110 000 FCFA pour un établissement privé partenaire. Ces frais couvrent l'analyse d'éligibilité, le montage du dossier selon la matrice documentaire, les échanges avec l'établissement et l'édition de votre attestation certifiée.",
  },
  {
    id: 4,
    question: "Comment fonctionne la réservation de logement CROUS et l'attestation d'hébergement ?",
    reponse:
      "GET Admission dispose d'un service dédié d'assistance au logement étudiant (résidences CROUS et logements privés partenaires). Dès validation de votre pré-admission, nous vous accompagnons pour obtenir une attestation d'hébergement ou une réservation ferme en résidence universitaire, document indispensable pour le dépôt de votre demande de visa long séjour.",
  },
  {
    id: 5,
    question: "Quelles sont les démarches et justificatifs financiers pour le visa étudiant France (VLS-TS) ?",
    reponse:
      "Pour obtenir le visa étudiant (VLS-TS), le consulat exige votre attestation de pré-inscription officielle, l'accord Campus France, un justificatif de logement (CROUS ou attestation d'hébergement) et une preuve de ressources financières suffisantes (caution bancaire bloquée ABI ou prise en charge par un garant fiable avec fiches de paie et avis d'imposition). Nos conseillers vous orientent pas à pas pour fiabiliser votre dossier consulaire.",
  },
  {
    id: 6,
    question: "Puis-je candidater sans le Baccalauréat si je suis actuellement en classe de Terminale ?",
    reponse:
      "Absolument ! Les lycéens en classe de Terminale peuvent initier leur dossier d'admission dès le premier ou second trimestre en fournissant leurs bulletins de Seconde, Première et Terminale ainsi qu'un certificat de scolarité. L'université émet une pré-admission sous réserve de l'obtention du Baccalauréat.",
  },
  {
    id: 7,
    question: "Quels documents académiques et pièces dois-je fournir ?",
    reponse:
      "Selon votre parcours, notre matrice documentaire intelligente adapte les pièces requises : pièce d'identité valide (passeport ou CNI), relevés de notes du lycée (2nde, 1ère, Terminale), attestation ou relevé du Baccalauréat, et relevés de notes de l'enseignement supérieur pour les candidats en Licence ou Master.",
  },
  {
    id: 8,
    question: "Quels sont les délais moyens pour obtenir mon attestation ?",
    reponse:
      "Le traitement global prend en moyenne entre 2 et 6 semaines : 48 à 72h pour la vérification initiale de conformité par votre conseiller GET Admission, puis 2 à 4 semaines de traitement pédagogique par l'université partenaire. Dès acceptation, l'attestation officielle de pré-inscription est générée sous 24 à 48 heures.",
  },
  {
    id: 9,
    question: "Est-il possible de régler les frais d'agence en plusieurs fois ?",
    reponse:
      "Oui, nous proposons une option de paiement en deux tranches pour vous faciliter les démarches. Vous pouvez régler vos frais par mobile money (Orange Money, Wave, Moov Money) ou par carte bancaire sécurisée avec reçu téléchargeable instantanément.",
  },
  {
    id: 10,
    question: "L'attestation de pré-inscription est-elle officielle et vérifiable ?",
    reponse:
      "Oui, chaque attestation délivrée comporte une référence unique et un code de sécurité vérifiable instantanément en ligne sur notre portail public (get-admission.com/verifier). Elle est émise sous l'autorité de l'université partenaire et respecte les critères requis par les consulats et ambassades.",
  },
  {
    id: 11,
    question: "Que se passe-t-il si l'université refuse ma candidature ?",
    reponse:
      "En cas de rejet par une université spécifique, votre conseiller analyse les motifs et vous propose immédiatement une réorientation vers une formation alternative compatible dans notre réseau partenaire, sans facturation de nouveaux frais de dossier.",
  },
  {
    id: 12,
    question: "Quels pays et destinations sont proposés par GET Admission ?",
    reponse:
      "Nous accompagnons principalement les candidatures vers la France, ainsi que le Canada, la Belgique et d'autres destinations européennes et africaines de premier plan (Maroc, Sénégal, Tunisie). Notre catalogue compte plus de 10 établissements partenaires de renom.",
  },
  {
    id: 13,
    question: "Depuis quels pays africains puis-je déposer ma candidature ?",
    reponse:
      "GET Admission accompagne les étudiants résidant partout en Afrique francophone et subsaharienne : Sénégal, Côte d'Ivoire, Guinée, Cameroun, Mali, Gabon, Congo, Togo, Bénin, Burkina Faso, Niger, Tchad, etc. L'ensemble de la procédure se fait 100% en ligne ou via nos conseillers régionaux.",
  },
  {
    id: 14,
    question: "Comment contacter mon conseiller personnel ?",
    reponse:
      "Dès la soumission de votre dossier, un conseiller attitré vous est assigné. Vous pouvez échanger directement avec lui via la messagerie instantanée intégrée à votre espace candidat ou par nos canaux de support téléphonique et e-mail.",
  },
];

export default async function FaqPage() {
  const dbItems = await db.faq.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
  }).catch(() => []);

  const faqItems = dbItems.length > 0 ? dbItems : DEFAULT_FAQS;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.reponse,
      },
    })),
  };


  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="bg-background" aria-labelledby="faq-title">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Aide</Eyebrow>
            <h1
              id="faq-title"
              className="mt-5 font-display text-4xl font-extrabold tracking-tightest text-foreground sm:text-5xl"
            >
              Questions fréquentes
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Tout ce qu'il faut savoir sur GET Admission, nos frais, nos délais et le suivi de votre
              dossier. Une question reste sans réponse ? Écrivez-nous.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card" aria-label="Liste des questions">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
            {/* Accordéon */}
            <Reveal>
              <div className="flex items-center gap-2 text-muted-foreground">
                <HelpCircle className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                <p className="font-mono text-[12px] uppercase tracking-eyebrow">
                  {faqItems.length} questions · réponses mises à jour en 2026
                </p>
              </div>

              <Accordion type="single" collapsible className="mt-6 w-full" defaultValue="item-0">
                {faqItems.map((item, i) => (
                  <AccordionItem key={item.id} value={`item-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:text-primary hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.reponse}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>

            {/* Sidebar CTA */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border border-border bg-primary/10 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                  <MessageCircleQuestion className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                  Une autre question ?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Un conseiller vous répond sous 24 heures ouvrées. Premier échange gratuit et sans
                  engagement.
                </p>
                <Button asChild size="lg" className="mt-5 w-full bg-primary text-blanc hover:bg-primary/90">
                  <Link href="/contact">
                    Poser ma question
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="mt-2 w-full border-border bg-card text-foreground hover:bg-background"
                >
                  <Link href="/universites">Voir le catalogue</Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
