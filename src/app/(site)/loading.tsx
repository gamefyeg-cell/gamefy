// Next.js route-level loading UI — shown automatically while the homepage's
// server data is being fetched, instead of a blank flash or a generic spinner.
// Shapes mirror the real layout (poster-card grid, hero) so there's minimal
// shift when the actual content swaps in.
export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-10">
      <div className="skeleton poster-cut rounded-xl min-h-[420px] md:min-h-[560px]" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton aspect-square rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="skeleton h-6 w-40 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton poster-cut aspect-[2/3] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
