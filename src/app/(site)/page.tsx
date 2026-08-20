import { prisma } from "@/lib/prisma";
import { getSelectedRegion } from "@/lib/region";
import HomepageBlockRenderer from "@/components/storefront/HomepageBlocks";
import Reveal from "@/components/motion/Reveal";

export default async function HomePage() {
  const region = await getSelectedRegion();
  const now = new Date();

  const blocks = await prisma.homepageBlock.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ targetRegionId: null }, { targetRegionId: region?.id }] },
        { OR: [{ scheduleStart: null }, { scheduleStart: { lte: now } }] },
        { OR: [{ scheduleEnd: null }, { scheduleEnd: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });

  if (blocks.length === 0) {
    return (
      <div className="text-center py-24">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Gamefy</h1>
        <p className="text-slate-400">
          No homepage blocks configured yet — add some from{" "}
          <a href="/admin/homepage-blocks" className="text-accent-soft underline">
            the admin panel
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {blocks.map((block, i) => (
        <Reveal key={block.id} delay={Math.min(i * 0.06, 0.24)}>
          <HomepageBlockRenderer block={block} />
        </Reveal>
      ))}
    </div>
  );
}
