import type Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, getAnthropicClient } from "./client";

export class StructuredGenerationError extends Error {}

interface CallStructuredToolArgs {
  system: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
}

// Forces the model to respond through a single tool call whose input_schema
// matches our contract, rather than parsing freeform prose. This is what
// makes the "every section cites a source" and "gaps instead of invented
// content" rules structural instead of a request we hope the model honors.
export async function callStructuredTool({
  system,
  userPrompt,
  toolName,
  toolDescription,
  inputSchema,
}: CallStructuredToolArgs): Promise<unknown> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userPrompt }],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: inputSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    throw new StructuredGenerationError(
      `Model response did not include a ${toolName} tool call.`
    );
  }

  return toolUse.input;
}
