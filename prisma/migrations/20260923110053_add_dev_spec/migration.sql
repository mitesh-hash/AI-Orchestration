-- CreateTable
CREATE TABLE "DevSpec" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceDocumentId" TEXT NOT NULL,
    "prototypeExtractionId" TEXT NOT NULL,

    CONSTRAINT "DevSpec_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DevSpec" ADD CONSTRAINT "DevSpec_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "RequirementDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevSpec" ADD CONSTRAINT "DevSpec_prototypeExtractionId_fkey" FOREIGN KEY ("prototypeExtractionId") REFERENCES "PrototypeExtraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
