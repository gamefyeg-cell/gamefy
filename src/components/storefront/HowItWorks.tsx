const STEPS = [
  { n: 1, icon: "🎯", title: "Pick your version", body: "Choose the platform, edition or plan that fits — each has its own price and stock." },
  { n: 2, icon: "📲", title: "Pay by InstaPay or Telda", body: "Send the transfer to the account shown at checkout and upload a screenshot of the receipt." },
  { n: 3, icon: "✅", title: "We verify it", body: "Our team confirms the transfer landed — usually within a few minutes." },
  { n: 4, icon: "🔓", title: "Reveal your order", body: "Your key or account details unlock on your order page — a one-time, encrypted reveal." },
];

export default function HowItWorks() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-semibold text-white">How it works</h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="relative rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent-soft">
                {s.n}
              </span>
              <span className="text-lg" aria-hidden>
                {s.icon}
              </span>
            </div>
            <div className="mt-2.5 text-sm font-semibold text-white">{s.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
