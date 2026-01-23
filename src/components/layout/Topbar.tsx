interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-line rounded-2xl bg-white/80 backdrop-blur-sm mb-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-0.5">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
