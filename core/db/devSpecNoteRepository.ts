import { prisma } from "./prisma";

export interface CreateDevSpecNoteInput {
  transcriptId: string;
  title?: string;
  rawText: string;
}

export async function createDevSpecNote(input: CreateDevSpecNoteInput) {
  return prisma.devSpecNote.create({ data: input });
}

export async function getDevSpecNote(id: string) {
  return prisma.devSpecNote.findUnique({ where: { id } });
}

export async function listDevSpecNotesForTranscript(transcriptId: string) {
  return prisma.devSpecNote.findMany({
    where: { transcriptId },
    orderBy: { createdAt: "asc" },
  });
}
