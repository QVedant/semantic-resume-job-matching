// A thin horizontal bar: `value` out of `max`, with a label and a number in
// the data font.
export default function Bar({
  label,
  value,
  max,
  display,
}: {
  label?: React.ReactNode;
  value: number;
  max: number;
  display?: string; // text shown on the right, defaults to the value
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-mono text-[13px] font-bold">{display ?? value}</span>
      </div>
      <div className="h-1 rounded-full bg-line">
        <div className="h-1 rounded-full bg-primary-strong" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
