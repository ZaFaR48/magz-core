export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl md:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/80 to-violet-500/0" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-normal text-[color:var(--foreground)] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)] md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action}
      </div>
    </div>
  );
}
