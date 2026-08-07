import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { buildFicheCandidatPdfBuffer } from "@/lib/pdf/documents";
import { formatDate } from "@/lib/format";
import { etatParCode } from "@/lib/etats";
import type { SendMailAttachment } from "@/lib/mail";

/** Charge une demande CROUS avec tout le nécessaire pour l'affichage et le partage. */
export function demandeCrousInclude() {
  return {
    dossier: {
      include: {
        candidat: true,
        universite: { select: { nom: true } },
        formation: { select: { intitule: true } },
        pieces: true,
        attestation: true,
      },
    },
    documents: { orderBy: { televerseLe: "desc" as const } },
    partages: { orderBy: { createdAt: "desc" as const } },
  };
}

export type DemandeCrousComplete = NonNullable<
  Awaited<ReturnType<typeof fetchDemandeCrous>>
>;

export async function fetchDemandeCrous(id: string) {
  return db.demandeCrous.findUnique({
    where: { id },
    include: demandeCrousInclude(),
  });
}

/** Pièce du dossier dont le libellé évoque le mot-clé donné (insensible à la casse). */
function findPieceByKeyword(
  pieces: DemandeCrousComplete["dossier"]["pieces"],
  keyword: string,
) {
  const needle = keyword.toLowerCase();
  return pieces.find(
    (p) => p.cheminFichier && p.libelle.toLowerCase().includes(needle),
  );
}

/** Détermine, pour l'UI de partage, quelles pièces sont réellement disponibles pour ce dossier. */
export function getAvailableAttachments(demande: DemandeCrousComplete) {
  const { dossier, documents } = demande;
  return {
    infosCandidat: true, // fiche générée à la volée, toujours disponible
    kyc: !!(dossier.candidat.kycRectoPath || dossier.candidat.kycVersoPath),
    visa: !!findPieceByKeyword(dossier.pieces, "visa"),
    accordPrealable: !!(
      dossier.attestation?.cheminFichier || findPieceByKeyword(dossier.pieces, "accord")
    ),
    docsCrous: documents.length > 0,
  };
}

export type CrousInclureFlags = {
  infosCandidat: boolean;
  kyc: boolean;
  visa: boolean;
  accordPrealable: boolean;
  docsCrous: boolean;
};

/** Assemble les pièces jointes réellement envoyables selon les cases cochées et la disponibilité réelle. */
export async function assemblePartageAttachments(
  demande: DemandeCrousComplete,
  inclure: CrousInclureFlags,
  generatedBy: string,
): Promise<{ attachments: SendMailAttachment[]; labels: string[] }> {
  const { dossier, documents } = demande;
  const attachments: SendMailAttachment[] = [];
  const labels: string[] = [];

  if (inclure.infosCandidat) {
    const pdf = await buildFicheCandidatPdfBuffer({
      candidat: `${dossier.candidat.prenom} ${dossier.candidat.nom}`,
      email: dossier.candidat.email,
      telephone: dossier.candidat.telephone,
      nationalite: dossier.candidat.nationalite,
      dateNaissance: dossier.candidat.dateNaissance,
      adresse: dossier.candidat.adresse,
      dossierRef: dossier.reference,
      universite: dossier.universite.nom,
      formation: dossier.formation.intitule,
      etatLabel: etatParCode(dossier.etat).libelle,
      generatedAtStr: formatDate(new Date().toISOString()),
      generatedBy,
    });
    attachments.push({
      filename: `fiche-candidat-${dossier.reference}.pdf`,
      content: Buffer.from(pdf).toString("base64"),
    });
    labels.push("Informations candidat");
  }

  if (inclure.kyc) {
    for (const [side, path] of [
      ["recto", dossier.candidat.kycRectoPath],
      ["verso", dossier.candidat.kycVersoPath],
    ] as const) {
      if (!path) continue;
      try {
        const { buffer, fileName } = await readUpload(path, "private");
        attachments.push({
          filename: `kyc-${side}-${fileName}`,
          content: buffer.toString("base64"),
        });
      } catch {
        // fichier illisible/manquant — ignoré silencieusement, non bloquant pour le reste de l'envoi
      }
    }
    if (dossier.candidat.kycRectoPath || dossier.candidat.kycVersoPath) {
      labels.push("Pièce d'identité (KYC)");
    }
  }

  if (inclure.visa) {
    const piece = findPieceByKeyword(dossier.pieces, "visa");
    if (piece?.cheminFichier) {
      try {
        const { buffer, fileName } = await readUpload(piece.cheminFichier, "private");
        attachments.push({ filename: fileName, content: buffer.toString("base64") });
        labels.push("Visa");
      } catch {
        // ignoré
      }
    }
  }

  if (inclure.accordPrealable) {
    const cheminFichier =
      dossier.attestation?.cheminFichier ?? findPieceByKeyword(dossier.pieces, "accord")?.cheminFichier;
    if (cheminFichier) {
      try {
        const { buffer, fileName } = await readUpload(cheminFichier, "private");
        attachments.push({ filename: fileName, content: buffer.toString("base64") });
        labels.push("Accord préalable d'admission");
      } catch {
        // ignoré
      }
    }
  }

  if (inclure.docsCrous && documents.length > 0) {
    for (const doc of documents) {
      try {
        const { buffer, fileName } = await readUpload(doc.cheminFichier, "private");
        attachments.push({ filename: fileName, content: buffer.toString("base64") });
      } catch {
        // ignoré
      }
    }
    labels.push(`Documents demande CROUS (${documents.length})`);
  }

  return { attachments, labels };
}
