-- CreateEnum
CREATE TYPE "DiagramType" AS ENUM ('USER_FLOW');

-- CreateTable
CREATE TABLE "Diagram" (
    "id" TEXT NOT NULL,
    "type" "DiagramType" NOT NULL,
    "content" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceDocumentId" TEXT NOT NULL,

    CONSTRAINT "Diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignSystemNote" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "title" TEXT,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignSystemNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WireframeSet" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceDocumentId" TEXT NOT NULL,
    "designSystemNoteId" TEXT NOT NULL,

    CONSTRAINT "WireframeSet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Diagram" ADD CONSTRAINT "Diagram_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "RequirementDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignSystemNote" ADD CONSTRAINT "DesignSystemNote_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireframeSet" ADD CONSTRAINT "WireframeSet_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "RequirementDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WireframeSet" ADD CONSTRAINT "WireframeSet_designSystemNoteId_fkey" FOREIGN KEY ("designSystemNoteId") REFERENCES "DesignSystemNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
