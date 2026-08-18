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
  title: "Foire Aux Questions (FAQ) — Tonomi",
  description:
    "Trouvez les réponses à toutes vos questions sur les démarches d'admission universitaire avec Tonomi (GET Admission), les frais d'agence fixes, les pièces académiques, les délais et le logement CROUS.",
  alternates: {
    canonical: "https://get-admission.com/faq",
  },
  openGraph: {
    title: "FAQ Tonomi — Réponses à vos questions d'admission",
    description:
      "Tout ce qu'il faut savoir sur Tonomi (GET Admission), nos frais, nos délais et le suivi de votre dossier d'admission.",
    url: "https://get-admission.com/faq",
    type: "website",
  },
};

export default async function FaqPage() {
  const faqItems = await db.faq.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
  }).catch(() => []);

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
