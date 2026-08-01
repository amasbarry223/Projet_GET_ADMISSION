import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pieceSchema, validate } from "@/lib/validations";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { isDossierEditableByCandidate } from "@/shared/constants";

// POST /api/dossiers/[id]/pieces
// - multipart/form-data : file + libelle (+ statut optionnel) → upload réel
// - application/json : toggle métadonnées (staff validation)
export async function POST(
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

  const contentType = request.headers.get("content-type") || "";

  // ── Upload multipart ──
  if (contentType.includes("multipart/form-data")) {
    if (role === "CANDIDAT" && !isDossierEditableByCandidate(dossier.etat)) {
      return NextResponse.json(
        { error: "Upload impossible dans l'état actuel du dossier" },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const libelle = String(form.get("libelle") || "").trim();
    if (!libelle) {
      return NextResponse.json({ error: "Libellé requis" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    let uploaded;
    try {
      uploaded = await saveUpload(file, `pieces/${id}`);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Upload échoué" },
        { status: 400 }
      );
    }

    const existing = await db.piece.findFirst({ where: { dossierId: id, libelle } });
    if (existing?.cheminFichier) {
      await deleteUpload(existing.cheminFichier);
    }

    const data = {
      statut: "televersee" as const,
      type: uploaded.type,
      nomFichier: uploaded.nomFichier,
      taille: uploaded.taille,
      cheminFichier: uploaded.cheminRelatif,
      televerseeLe: new Date(),
    };

    const piece = existing
      ? await db.piece.update({ where: { id: existing.id }, data })
      : await db.piece.create({ data: { dossierId: id, libelle, ...data } });

    await db.historique.create({
      data: {
        dossierId: id,
        etat: dossier.etat,
        auteur: `${(session.user as { prenom: string }).prenom} ${(session.user as { nom: string }).nom}`,
        auteurId: userId,
        note: `Pièce « ${libelle} » téléversée (${uploaded.nomFichier}, ${uploaded.taille})`,
      },
    });

    return NextResponse.json(piece, { status: existing ? 200 : 201 });
  }

  // ── JSON (validation staff / toggle) ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(pieceSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { libelle, statut, type, nomFichier, taille } = parsed.data;

  // Candidat : JSON ne peut que réinitialiser à « manquante » (upload = multipart uniquement)
  if (role === "CANDIDAT") {
    if (statut !== "manquante") {
      return NextResponse.json(
        { error: "Pour marquer une pièce comme téléversée, utilisez l'upload de fichier" },
        { status: 400 }
      );
    }
  }

  // Seul le staff peut marquer validee / a_corriger
  if ((statut === "validee" || statut === "a_corriger") && !hasPermission(role, "dossiers.write")) {
    return NextResponse.json({ error: "Seul un conseiller peut valider ou renvoyer une pièce" }, { status: 403 });
  }

  const existing = await db.piece.findFirst({ where: { dossierId: id, libelle } });

  // televersee / validee exige un fichier déjà stocké
  if ((statut === "televersee" || statut === "validee") && !existing?.cheminFichier) {
    return NextResponse.json(
      { error: "Impossible de valider ou marquer téléversée une pièce sans fichier" },
      { status: 400 }
    );
  }

  const televerseeLe = statut === "televersee" || statut === "validee" ? new Date() : undefined;

  let piece;
  if (existing) {
    piece = await db.piece.update({
      where: { id: existing.id },
      data: {
        statut,
        ...(type ? { type } : {}),
        ...(nomFichier !== undefined ? { nomFichier } : {}),
        ...(taille !== undefined ? { taille } : {}),
        ...(televerseeLe ? { televerseeLe } : {}),
        ...(statut === "manquante"
          ? { cheminFichier: null, nomFichier: null, taille: null, televerseeLe: null }
          : {}),
      },
    });
  } else {
    if (statut !== "manquante") {
      return NextResponse.json(
        { error: "Créez d'abord la pièce via l'upload de fichier" },
        { status: 400 }
      );
    }
    piece = await db.piece.create({
      data: {
        dossierId: id,
        libelle,
        statut: "manquante",
        type: type ?? "pdf",
        nomFichier: null,
        taille: null,
        televerseeLe: null,
      },
    });
  }

  await db.historique.create({
    data: {
      dossierId: id,
      etat: dossier.etat,
      auteur: `${(session.user as { prenom: string }).prenom} ${(session.user as { nom: string }).nom}`,
      auteurId: userId,
      note: `Pièce « ${libelle} » → ${statut.replace(/_/g, " ").toLowerCase()}`,
    },
  });

  return NextResponse.json(piece, { status: existing ? 200 : 201 });
}

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
    select: { candidatId: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (role !== "CANDIDAT") {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const pieces = await db.piece.findMany({
    where: { dossierId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pieces);
}
