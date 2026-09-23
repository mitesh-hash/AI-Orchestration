export const UNSPECIFIED_OWNER = "Owner not specified";

// FR-6: an action item with no owner stated in the transcript is always
// labeled explicitly, never left blank and never guessed at.
export function normalizeOwner(owner: string | null | undefined): string {
  if (!owner || !owner.trim()) return UNSPECIFIED_OWNER;
  return owner.trim();
}
