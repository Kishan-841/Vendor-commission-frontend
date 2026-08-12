export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {/* Refined editorial title (Instrument Serif), sized for presence. */}
        <h1
          className="text-[2rem] leading-[1.1] tracking-tight"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
