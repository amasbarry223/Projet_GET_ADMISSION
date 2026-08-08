-- AlterEnum
ALTER TYPE "StatutLogementReservation" ADD VALUE 'correction_demandee';

-- AlterTable
ALTER TABLE "LogementReservation" ADD COLUMN "motifCorrection" TEXT;
