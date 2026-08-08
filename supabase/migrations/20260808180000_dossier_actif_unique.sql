-- Empêche l'existence de plusieurs dossiers actifs pour un même candidat sur une même formation.
-- Le contrôle applicatif (SELECT puis INSERT dans la même transaction, src/app/api/dossiers/route.ts)
-- n'est pas atomique en isolation READ COMMITTED (défaut Postgres/Prisma) sans verrou explicite :
-- un double-clic ou deux requêtes quasi simultanées pouvaient créer deux dossiers BROUILLON pour
-- la même formation. Index unique partiel (Prisma ne supporte pas ce type d'index de façon
-- déclarative dans schema.prisma) : la contrainte ne s'applique qu'aux dossiers non clôturés/refusés,
-- pour ne pas empêcher un candidat de reposer sa candidature après un refus ou une clôture.
CREATE UNIQUE INDEX "Dossier_candidatId_formationId_actif_key"
ON "Dossier" ("candidatId", "formationId")
WHERE "etat" NOT IN ('REFUSE', 'CLOTURE');
