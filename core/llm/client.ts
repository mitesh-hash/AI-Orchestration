import Anthropic from "@anthropic-ai/sdk";

// Every LLM call in the app goes through this one client instance so the
// provider can be swapped later without touching the generation modules.
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Refusing to call the LLM without it " +
        "rather than failing in a confusing way deeper in the stack."
    );
  }

  client = new Anthropic({ apiKey });
  return client;
}

// Configurable so an operator can point at a newer/older Claude model
// without a code change. Check the current model id in the Anthropic docs
// before relying on this default in production.
export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
