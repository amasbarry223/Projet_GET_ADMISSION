import type { Prisma } from "@prisma/client";

type TxLike = {
  matriceVersion: {
    findFirst: (args: {
      where: { statut: "ACTIVE" };
      orderBy: { activatedAt: "desc" };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/** Retourne l'id de la matrice ACTIVE (la plus récemment activée). */
export async function resolveActiveMatriceVersionId(
  tx: TxLike | Prisma.TransactionClient,
): Promise<string | null> {
  const active = await tx.matriceVersion.findFirst({
    where: { statut: "ACTIVE" },
    orderBy: { activatedAt: "desc" },
    select: { id: true },
  });
  return active?.id ?? null;
}
