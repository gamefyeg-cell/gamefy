export default function ProductLoading() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="flex flex-col gap-4">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton aspect-video rounded-xl" />
        <div className="skeleton h-7 w-2/3 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-24 rounded-lg" />
      </div>
      <div className="skeleton rounded-xl h-96" />
    </div>
  );
}
