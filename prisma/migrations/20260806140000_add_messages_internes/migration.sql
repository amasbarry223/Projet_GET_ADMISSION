-- CreateTable
CREATE TABLE "ConversationInterne" (
    "id" TEXT NOT NULL,
    "financierId" TEXT NOT NULL,
    "nonLusFinancier" INTEGER NOT NULL DEFAULT 0,
    "nonLusAdmin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationInterne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageInterne" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageInterne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationInterne_financierId_key" ON "ConversationInterne"("financierId");

-- AddForeignKey
ALTER TABLE "ConversationInterne" ADD CONSTRAINT "ConversationInterne_financierId_fkey" FOREIGN KEY ("financierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInterne" ADD CONSTRAINT "MessageInterne_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ConversationInterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInterne" ADD CONSTRAINT "MessageInterne_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
