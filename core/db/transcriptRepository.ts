import { prisma } from "./prisma";

export interface CreateTranscriptInput {
  rawText: string;
  title?: string;
  meetingDate: Date;
  source: "paste" | "upload";
}

export async function createTranscript(input: CreateTranscriptInput) {
  return prisma.transcript.create({ data: input });
}

export async function getTranscript(id: string) {
  return prisma.transcript.findUnique({ where: { id } });
}

export async function listTranscripts() {
  return prisma.transcript.findMany({ orderBy: { createdAt: "desc" } });
}
