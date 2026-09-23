// A single error type for every guardrail failure across modules, so API
// routes can catch one class and turn it into a clear 4xx response instead
// of leaking an internal error shape (ZodError, Prisma error, etc).
export class GuardrailViolationError extends Error {}
