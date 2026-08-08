-- AlterEnum: ajoute un statut intermediaire "en_cours_traitement", pris automatiquement
-- quand un membre du staff ouvre la fiche detail d'une demande de logement encore "soumis".
ALTER TYPE "StatutLogementReservation" ADD VALUE 'en_cours_traitement' AFTER 'soumis';
