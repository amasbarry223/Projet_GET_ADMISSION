import * as React from "react";
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

const FAQ = [
  {
    q: "Comment fonctionne GET Admission ?",
    r: "Vous créez un compte en ligne, choisissez votre université et votre formation, puis constituez votre dossier avec l'aide d'un conseiller dédié. Une fois les pièces validées et les frais d'agence réglés, nous transmettons le dossier à l'université. Vous suivez chaque étape depuis votre espace candidat, jusqu'à l'attestation de pré-inscription.",
  },
  {
    q: "Quels sont les frais d'agence ?",
    r: "Les frais d'agence varient selon l'université et la formation. Ils vont de 280 000 FCFA (Université de Yaoundé I, Licence sciences biologiques) à 1 750 000 FCFA (Université Libano-Américaine, Master Architecture). Le montant exact est affiché sur chaque fiche formation avant validation du dossier. Aucune avance cachée n'est demandée.",
  },
  {
    q: "Quels documents dois-je préparer ?",
    r: "Les pièces varient selon la formation, mais en général : diplôme du dernier niveau, relevé de notes, CV, lettre de motivation, test de français (TCF/DELF) ou d'anglais (IELTS/TOEFL). La liste exacte est indiquée sur chaque fiche formation. Votre conseiller vous confirmera les pièces attendues.",
  },
  {
    q: "Combien de temps prend une admission ?",
    r: "En moyenne trois à six semaines entre la soumission du dossier complet et la décision de l'université. Ce délai dépend de l'université et de la période de l'année. Les délais typiques sont affichés sur chaque fiche université partenaire.",
  },
  {
    q: "Puis-je payer en plusieurs fois ?",
    r: "Oui. Pour les frais d'agence supérieurs à 800 000 FCFA, un paiement en deux tranches est possible : 60 % à la transmission du dossier, 40 % à la pré-admission. Les moyens acceptés sont Orange Money, Moov Money, Wave et carte bancaire.",
  },
  {
    q: "Que se passe-t-il en cas de refus ?",
    r: "Si l'université refuse votre dossier, nous analysons avec vous les raisons et vous proposons gratuitement une seconde candidature dans une autre université partenaire, sous réserve d'éligibilité. Les frais d'agence déjà réglés couvrent cette seconde soumission.",
  },
  {
    q: "Dans quels pays proposez-vous des universités ?",
    r: "Six pays sont actuellement couverts : France, Belgique, Canada, Maroc, Tunisie, Liban, Cameroun, Sénégal et Afrique du Sud. Le catalogue complet est consultable sur la page Universités. De nouveaux partenariats sont en cours pour 2026.",
  },
  {
    q: "Comment suivre l'avancement de mon dossier ?",
    r: "Votre espace candidat affiche en temps réel l'état de votre dossier, pièce par pièce, étape par étape (brouillon, soumis, vérification, paiement, transmission, réponse). Vous recevez une notification par e-mail à chaque changement de statut. Un fil de messagerie direct vous relie à votre conseiller.",
  },
  {
    q: "L'attestation est-elle officielle ?",
    r: "Oui. L'attestation de pré-inscription est délivrée par l'université partenaire et porte son sceau. GET Admission vous la transmet telle quelle, sans modification. Elle est reconnue pour les démarches de visa étudiant.",
  },
  {
    q: "Puis-je récupérer mon attestation à l'agence ?",
    r: "Oui. Vous pouvez télécharger l'attestation en PDF depuis votre espace candidat, ou la retirer en version papier tamponnée à l'une de nos agences (Dakar, Abidjan, Lomé), sur rendez-vous. Le retrait en agence est gratuit.",
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="bg-porcelaine" aria-labelledby="faq-title">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Aide</Eyebrow>
            <h1
              id="faq-title"
              className="mt-5 font-display text-4xl font-extrabold tracking-tightest text-encre sm:text-5xl"
            >
              Questions fréquentes
            </h1>
            <p className="mt-4 text-lg text-ardoise">
              Tout ce qu'il faut savoir sur GET Admission, nos frais, nos délais et le suivi de votre
              dossier. Une question reste sans réponse ? Écrivez-nous.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-blanc" aria-label="Liste des questions">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
            {/* Accordéon */}
            <Reveal>
              <div className="flex items-center gap-2 text-ardoise">
                <HelpCircle className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                <p className="font-mono text-[12px] uppercase tracking-eyebrow">
                  {FAQ.length} questions · réponses mises à jour en 2026
                </p>
              </div>

              <Accordion type="single" collapsible className="mt-6 w-full" defaultValue="item-0">
                {FAQ.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-ligne">
                    <AccordionTrigger className="text-left font-display text-base font-semibold text-encre hover:text-lapis hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-ardoise">
                      {item.r}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>

            {/* Sidebar CTA */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg border border-ligne bg-or-pale/50 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blanc text-lapis shadow-sm">
                  <MessageCircleQuestion className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-encre">
                  Une autre question ?
                </h2>
                <p className="mt-2 text-sm text-ardoise">
                  Un conseiller vous répond sous 24 heures ouvrées. Premier échange gratuit et sans
                  engagement.
                </p>
                <Button asChild size="lg" className="mt-5 w-full bg-lapis text-blanc hover:bg-lapis/90">
                  <Link href="/contact">
                    Poser ma question
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="mt-2 w-full border-ligne bg-blanc text-encre hover:bg-porcelaine"
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
