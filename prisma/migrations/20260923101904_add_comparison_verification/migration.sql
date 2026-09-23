-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "labelA" TEXT,
    "textA" TEXT NOT NULL,
    "labelB" TEXT,
    "textB" TEXT NOT NULL,
    "content" JSONB,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrototypeExtraction" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "title" TEXT,
    "rawHtml" TEXT NOT NULL,
    "content" JSONB,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrototypeExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrototypeCrossCheck" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceDocumentId" TEXT NOT NULL,
    "prototypeExtractionId" TEXT NOT NULL,

    CONSTRAINT "PrototypeCrossCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrototypeExtraction" ADD CONSTRAINT "PrototypeExtraction_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrototypeCrossCheck" ADD CONSTRAINT "PrototypeCrossCheck_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "RequirementDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrototypeCrossCheck" ADD CONSTRAINT "PrototypeCrossCheck_prototypeExtractionId_fkey" FOREIGN KEY ("prototypeExtractionId") REFERENCES "PrototypeExtraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
