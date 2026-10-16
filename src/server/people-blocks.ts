import "server-only";
import type { BranchCode, LeaderGroup } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { VolunteerBlock } from "@/lib/schemas/blocks";
import type { ColourToken } from "@/lib/schemas/common";

const RING: Record<BranchCode, ColourToken> = {
  EXPERIENCE: "experience",
  MINISTRY: "ministry",
  CREATIVE: "creative",
  SYSTEMS: "systems",
};

/**
 * Fills PEOPLE blocks in "auto" mode (content.source.group) with the
 * group's active leaders, in their People & Teams order, ringed in their
 * branch's colour. One query for the whole page; other blocks pass through.
 */
export async function resolvePeopleBlocks(
  blocks: VolunteerBlock[],
): Promise<VolunteerBlock[]> {
  const groups = new Set<LeaderGroup>();
  for (const block of blocks) {
    if (block.type === "PEOPLE" && block.content.source) {
      groups.add(block.content.source.group);
    }
  }
  if (groups.size === 0) return blocks;

  const leaders = await prisma.leader.findMany({
    where: { isActive: true, group: { in: [...groups] } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      name: true,
      role: true,
      photoUrl: true,
      group: true,
      branch: { select: { code: true } },
    },
  });

  return blocks.flatMap((block) => {
    if (block.type !== "PEOPLE" || !block.content.source) return [block];
    const { group } = block.content.source;
    const people = leaders
      .filter((leader) => leader.group === group)
      .map((leader) => ({
        name: leader.name,
        role: leader.role,
        ...(leader.photoUrl && { photoUrl: leader.photoUrl }),
        ...(leader.branch && { ringColour: RING[leader.branch.code] }),
      }));
    // Nobody active in the group: leave the block out rather than show it empty.
    return people.length > 0
      ? [{ ...block, content: { ...block.content, people } }]
      : [];
  });
}
