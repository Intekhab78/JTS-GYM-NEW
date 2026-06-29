export default function SectionTitle({ kicker, title, subtitle }) {
  return (
    <div className="mb-8">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-moss">
          {kicker}
        </p>
      ) : null}
      <h2 className="mt-2 font-display text-3xl text-ink md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-sm text-ink/70 md:text-base">{subtitle}</p> : null}
      <div className="mt-4 h-1 w-16 rounded-full bg-coral/80" />
    </div>
  );
}
