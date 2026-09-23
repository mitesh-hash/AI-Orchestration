import { prisma } from "./prisma";
import type { ExtractedActionItem } from "../actions-tickets/extractActionItems";

export async function saveActionItems(
  transcriptId: string,
  items: ExtractedActionItem[]
) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.actionItem.create({
        data: {
          transcriptId,
          description: item.description,
          owner: item.owner,
          deadline: item.deadline,
        },
      })
    )
  );
}

export async function listActionItemsForTranscript(transcriptId: string) {
  return prisma.actionItem.findMany({
    where: { transcriptId },
    orderBy: { createdAt: "asc" },
  });
}
