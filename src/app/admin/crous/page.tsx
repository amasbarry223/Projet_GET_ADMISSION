import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { Share2 } from "lucide-react";

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_COURS: "En cours",
  PARTAGEE: "Partagée",
  CLOTUREE: "Clôturée",
};

const STATUT_TONE: Record<string, string> = {
  BROUILLON: "text-ardoise border-ardoise bg-ardoise/5",
  EN_COURS: "text-ambre border-ambre bg-ambre/5",
  PARTAGEE: "text-vert border-vert bg-vert/5",
  CLOTUREE: "text-lapis border-lapis bg-lapis/5",
};

export default async function AdminCrousPage() {
  await requireAdminPage("crous.manage");

  const demandes = await db.demandeCrous.findMany({
    include: {
      dossier: {
        select: {
          reference: true,
          candidat: { select: { prenom: true, nom: true } },
          universite: { select: { nom: true } },
        },
      },
      _count: { select: { documents: true, partages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-encre">Demandes CROUS</h1>
        <p className="mt-1 text-sm text-ardoise">
          Partage des demandes CROUS avec les organismes concernés — accès réservé Super Admin.
        </p>
      </div>

      <Card className="border-ligne bg-card p-0 overflow-hidden">
        {demandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Share2 className="h-8 w-8 text-ardoise" strokeWidth={1.5} />
            <p className="text-sm text-ardoise">
              Aucune demande CROUS. Créez-en une depuis la fiche d&apos;un dossier candidat.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dossier</TableHead>
                <TableHead>Candidat</TableHead>
                <TableHead>Université</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Partages</TableHead>
                <TableHead>Mis à jour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demandes.map((d) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-porcelaine/60">
                  <TableCell>
                    <Link href={`/admin/crous/${d.id}`} className="font-mono text-sm text-lapis hover:underline">
                      {d.dossier.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-encre">
                    {d.dossier.candidat.prenom} {d.dossier.candidat.nom}
                  </TableCell>
                  <TableCell className="text-sm text-ardoise">{d.dossier.universite.nom}</TableCell>
                  <TableCell>
                    <Badge className={`font-mono text-[10px] uppercase ${STATUT_TONE[d.statut] ?? ""}`}>
                      {STATUT_LABEL[d.statut] ?? d.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-ardoise">{d._count.documents}</TableCell>
                  <TableCell className="text-sm text-ardoise">{d._count.partages}</TableCell>
                  <TableCell className="text-sm text-ardoise">{formatDateTime(d.updatedAt.toISOString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
