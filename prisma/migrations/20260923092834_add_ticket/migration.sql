-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('PRODUCT_DISCOVERY', 'DEVELOPMENT');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "milestone" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceDocumentId" TEXT NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "RequirementDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
