// A simple horizontal bar: `value` out of `max`, with a label and number.
export default function Bar({
  label,
  value,
  max,
  display,
}: {
  label: string;
  value: number;
  max: number;
  display?: string; // text shown on the right, defaults to the value
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{display ?? value}</span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/15">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
