export default function ProductFaq({
  warrantyDays,
  regionText,
  hasAccountVariant,
}: {
  warrantyDays: number | null;
  regionText: string | null;
  hasAccountVariant: boolean;
}) {
  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: "Is this genuine and safe to use?",
      a: "Yes. Every code and account is sourced legitimately and stored encrypted until you reveal it. Delivery only happens after we manually confirm your payment, so there are no chargebacks or surprises.",
    },
    {
      q: "What if my key or account doesn't work?",
      a: warrantyDays
        ? `Message support and we'll sort it out. This option comes with a ${warrantyDays}-day replacement warranty — a working replacement or a refund.`
        : "Message support right away with a short screen recording of the error and we'll replace it or refund you.",
    },
    {
      q: "Which region does it work in?",
      a: regionText
        ? `The selected option activates in ${regionText}. Double-check the "What you get" box before buying — region is set per option.`
        : "Activation region is shown per option in the “What you get” box. Pick the one that matches your account region.",
    },
    {
      q: "How long until I get my order?",
      a: "Once your payment screenshot is uploaded, verification usually takes a few minutes during working hours. You'll get an email the moment it's released, and the code/details appear on your order page.",
    },
    {
      q: "How do I pay?",
      a: "By InstaPay or Telda transfer. At checkout you'll see the exact account to send to; send the amount, upload the receipt screenshot, and we take it from there.",
    },
  ];

  if (hasAccountVariant) {
    faqs.splice(2, 0, {
      q: "For account options — can I change the email or password?",
      a: "Only if the option is marked “full access”. Shared / login-only accounts must be left exactly as delivered — changing the email, region or 2FA voids the warranty.",
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold text-white">Good to know</h2>

      <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        {faqs.map((f, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-slate-200 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-45">＋</span>
            </summary>
            <p className="px-4 pb-4 pr-8 text-[13px] leading-relaxed text-slate-400">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
