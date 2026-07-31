import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { dossierUpdateSchema, validate } from "@/lib/validations";
import { notifyDossierTransition } from "@/lib/notifications";
import { requirePermission } from "@/lib/rbac";

// GET /api/dossiers/[id] — détail (candidat propriétaire ou staff avec dossiers.read)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      candidat: { select: { id: true, prenom: true, nom: true, email: true, nationalite: true, telephone: true } },
      universite: true,
      formation: true,
      conseiller: { select: { id: true, prenom: true, nom: true, photoUrl: true } },
      pieces: true,
      paiements: true,
      historiques: { orderBy: { date: "asc" } },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT") {
    if (dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const result = {
    ...dossier,
    universite: {
      ...dossier.universite,
      domaines: JSON.parse(dossier.universite.domaines),
      pointsForts: JSON.parse(dossier.universite.pointsForts),
    },
    formation: {
      ...dossier.formation,
      prerequis: JSON.parse(dossier.formation.prerequis),
      piecesRequises: JSON.parse(dossier.formation.piecesRequises),
    },
  };

  return NextResponse.json(result);
}

// PUT /api/dossiers/[id]
// - Sauvegarde brouillon (info, pieces, etapeActuelle)
// - action=soumettre : BROUILLON → SOUMIS (BF-15)
// - action=resoumettre : CORRECTION → VERIFICATION (BF-16)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: { id: true, candidatId: true, reference: true, etat: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT") {
    if (dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.write");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // Candidat ne peut éditer qu'en BROUILLON ou CORRECTION
  if (
    role === "CANDIDAT" &&
    !["BROUILLON", "CORRECTION"].includes(dossier.etat)
  ) {
    return NextResponse.json(
      { error: "Ce dossier ne peut plus être modifié dans son état actuel" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(dossierUpdateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { etapeActuelle, info, pieces, action } = parsed.data;
  const conseillerId = (body as { conseillerId?: string | null })?.conseillerId;

  if (conseillerId !== undefined && role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const auteurLabel = `${(session.user as { prenom: string }).prenom} ${(session.user as { nom: string }).nom}`;

  // Validation soumission / resoumission
  if (action === "soumettre") {
    if (dossier.etat !== "BROUILLON") {
      return NextResponse.json({ error: "Seuls les brouillons peuvent être soumis" }, { status: 400 });
    }
    const manquantes = await db.piece.count({
      where: { dossierId: id, statut: { in: ["manquante", "a_corriger"] } },
    });
    if (manquantes > 0) {
      return NextResponse.json(
        { error: `${manquantes} pièce(s) obligatoire(s) manquante(s) ou à corriger` },
        { status: 400 }
      );
    }
  }
  if (action === "resoumettre") {
    if (dossier.etat !== "CORRECTION") {
      return NextResponse.json({ error: "Resoumission réservée aux dossiers « À corriger »" }, { status: 400 });
    }
    const manquantes = await db.piece.count({
      where: { dossierId: id, statut: { in: ["manquante", "a_corriger"] } },
    });
    if (manquantes > 0) {
      return NextResponse.json(
        { error: `${manquantes} pièce(s) encore à corriger ou manquante(s)` },
        { status: 400 }
      );
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const notes: string[] = [];
    let nouvelEtat = dossier.etat;

    if (conseillerId !== undefined && role !== "CANDIDAT") {
      await tx.dossier.update({ where: { id }, data: { conseillerId: conseillerId || null } });
      const cons = conseillerId
        ? await tx.user.findUnique({ where: { id: conseillerId }, select: { prenom: true, nom: true } })
        : null;
      notes.push(cons ? `Conseiller affecté : ${cons.prenom} ${cons.nom}` : "Conseiller désaffecté");
    }

    if (info) {
      const data: Record<string, string> = {};
      if (info.prenom !== undefined) data.prenom = info.prenom;
      if (info.nom !== undefined) data.nom = info.nom;
      if (info.telephone !== undefined) data.telephone = info.telephone;
      if (info.nationalite !== undefined) data.nationalite = info.nationalite;
      if (info.dateNaissance !== undefined) data.dateNaissance = info.dateNaissance;
      if (info.adresse !== undefined) data.adresse = info.adresse;
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id: dossier.candidatId }, data });
        notes.push("Informations personnelles mises à jour");
      }
    }

    if (pieces && pieces.length > 0) {
      for (const p of pieces) {
        const existing = await tx.piece.findFirst({ where: { dossierId: id, libelle: p.libelle } });
        if (existing) {
          await tx.piece.update({
            where: { id: existing.id },
            data: {
              statut: p.statut,
              ...(p.statut === "televersee" ? { televerseeLe: new Date() } : {}),
            },
          });
        } else {
          await tx.piece.create({
            data: {
              dossierId: id,
              libelle: p.libelle,
              statut: p.statut,
              televerseeLe: p.statut === "televersee" ? new Date() : null,
            },
          });
        }
      }
      notes.push(`${pieces.length} pièce(s) mise(s) à jour`);
    }

    if (action === "soumettre") {
      nouvelEtat = "SOUMIS";
      await tx.dossier.update({
        where: { id },
        data: { etat: "SOUMIS", etapeActuelle: 2 },
      });
      notes.push("Dossier soumis — entrée en file de traitement");
    } else if (action === "resoumettre") {
      nouvelEtat = "VERIFICATION";
      await tx.dossier.update({
        where: { id },
        data: { etat: "VERIFICATION", etapeActuelle: 3 },
      });
      notes.push("Corrections resoumises — retour en vérification");
    } else if (etapeActuelle !== undefined) {
      // Candidat : progression wizard 1–5 uniquement (ne pas écraser l'ordre workflow 1–12)
      const stepToSave = role === "CANDIDAT" ? Math.min(5, Math.max(1, etapeActuelle)) : etapeActuelle;
      await tx.dossier.update({
        where: { id },
        data: { etapeActuelle: stepToSave },
      });
      notes.push(`Étape passée à ${stepToSave}`);
    }

    if (notes.length > 0) {
      await tx.historique.create({
        data: {
          dossierId: id,
          etat: nouvelEtat as "BROUILLON" | "SOUMIS" | "VERIFICATION" | "CORRECTION",
          auteur: auteurLabel,
          auteurId: userId,
          note: notes.join(" · "),
        },
      });
    }

    return tx.dossier.findUnique({
      where: { id },
      include: {
        candidat: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            nationalite: true,
            telephone: true,
            dateNaissance: true,
            adresse: true,
          },
        },
        universite: true,
        formation: true,
        pieces: true,
        historiques: { orderBy: { date: "asc" } },
      },
    });
  });

  if (action === "soumettre" || action === "resoumettre") {
    try {
      await notifyDossierTransition({
        candidatId: dossier.candidatId,
        dossierId: id,
        reference: dossier.reference,
        nouvelEtat: action === "soumettre" ? "SOUMIS" : "VERIFICATION",
        note: action === "soumettre" ? "Votre dossier a été soumis." : "Vos corrections ont été renvoyées.",
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.json(updated);
}
