-- Alignement Prisma ↔ Postgres : unique Piece(dossierId, code) + matrice figée sur dossier
CREATE UNIQUE INDEX IF NOT EXISTS "Piece_dossierId_code_key"
ON "Piece" ("dossierId", code);

CREATE INDEX IF NOT EXISTS "Dossier_candidatId_formationId_idx"
ON "Dossier" ("candidatId", "formationId");

ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "matriceVersionId" TEXT;

CREATE INDEX IF NOT EXISTS "Dossier_matriceVersionId_idx"
ON "Dossier" ("matriceVersionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Dossier_matriceVersionId_fkey'
  ) THEN
    ALTER TABLE "Dossier"
      ADD CONSTRAINT "Dossier_matriceVersionId_fkey"
      FOREIGN KEY ("matriceVersionId") REFERENCES "MatriceVersion"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
