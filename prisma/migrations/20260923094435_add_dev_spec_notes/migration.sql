-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_sourceDocumentId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "sourceDevSpecId" TEXT,
ALTER COLUMN "sourceDocumentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DevSpecNote" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "title" TEXT,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevSpecNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "RequirementDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sourceDevSpecId_fkey" FOREIGN KEY ("sourceDevSpecId") REFERENCES "DevSpecNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevSpecNote" ADD CONSTRAINT "DevSpecNote_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
