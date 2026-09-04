import { Hero, TrendingSection, CategorySection, CollectionsSection } from "@/components/storefront/HomeSections";
import Reveal from "@/components/storefront/Reveal";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <Reveal>
        <Hero />
      </Reveal>
      <Reveal delay={0.06}>
        <TrendingSection />
      </Reveal>
      <Reveal delay={0.1}>
        <CategorySection />
      </Reveal>
      <Reveal delay={0.14}>
        <CollectionsSection />
      </Reveal>
    </div>
  );
}
