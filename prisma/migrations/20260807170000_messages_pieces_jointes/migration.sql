-- Pièces jointes sur les messages (dossier candidat<->conseiller et messagerie interne)
ALTER TABLE "Message" ADD COLUMN "pieceJointeChemin" TEXT;

ALTER TABLE "MessageInterne" ADD COLUMN "pieceJointeNom" TEXT;
ALTER TABLE "MessageInterne" ADD COLUMN "pieceJointeTaille" TEXT;
ALTER TABLE "MessageInterne" ADD COLUMN "pieceJointeChemin" TEXT;
