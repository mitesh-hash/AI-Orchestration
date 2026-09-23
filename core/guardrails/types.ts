// Decoupled from the Prisma-generated enum on purpose: this module (and its
// tests) must not depend on a generated client, so DB-layer code maps to/from
// these string literals, which are chosen to match the Prisma enum values.
export type DocumentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";
