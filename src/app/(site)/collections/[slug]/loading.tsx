export default function CollectionLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="skeleton h-8 w-56 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton poster-cut aspect-[2/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
