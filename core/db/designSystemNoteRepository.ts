import { prisma } from "./prisma";

export interface CreateDesignSystemNoteInput {
  transcriptId: string;
  title?: string;
  rawText: string;
}

export async function createDesignSystemNote(input: CreateDesignSystemNoteInput) {
  return prisma.designSystemNote.create({ data: input });
}

export async function getDesignSystemNote(id: string) {
  return prisma.designSystemNote.findUnique({ where: { id } });
}

export async function listDesignSystemNotesForTranscript(transcriptId: string) {
  return prisma.designSystemNote.findMany({
    where: { transcriptId },
    orderBy: { createdAt: "asc" },
  });
}
