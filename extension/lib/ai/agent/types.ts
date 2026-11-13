import { type UIMessage } from "ai";
import { z } from "zod";
import { INTENTS } from "./classifier";

export const messageMetadataSchema = z.object({
  intent: z.enum(INTENTS).nullable().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Create a typed UIMessage
export type RippleUIMessage = UIMessage<MessageMetadata>;
