import "server-only";
import {
  toVolunteerBlock,
  type ParsedBlock,
  type VolunteerBlock,
} from "@/lib/schemas/blocks";

/**
 * The last step before a block leaves the server. Knowledge checks lose
 * their correctOptionId and explanation; answers are only revealed one at a
 * time by checkKnowledgeAnswer.
 */
export function toPublicBlock(block: ParsedBlock): VolunteerBlock {
  return toVolunteerBlock(block);
}
