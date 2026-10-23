import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import type { HistorySelection } from "@/lib/finance/analytics";
import { formatPrice } from "@/lib/format";

/** Shared pieces for the finance pages (server-safe: no hooks). */

export const money = (value: number) => formatPrice(value, siteConfig.currency);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

/**
 * History filter: one day or a From–To range — nothing else. A plain GET
 * form, so the chosen dates are in the page address (shareable, back button
 * works) and it works without JavaScript; CSS shows the fields for the mode
 * that's ticked, and `mode` tells the page which fields count.
 */
export function DateFilter({
  selection,
  today,
  basePath,
  extra,
}: {
  selection: HistorySelection;
  today: string;
  basePath: string;
  extra?: Record<string, string>;
}) {
  const id = basePath.replaceAll("/", "-");
  const { mode, range } = selection;
  const field = "rounded-lg border border-line bg-white px-3 py-2 text-sm";
  const tab =
    "inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm text-charcoal transition-colors hover:bg-white has-[:checked]:bg-charcoal has-[:checked]:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sage-deep";
  return (
    <form
      action={basePath}
      className="group mb-6 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]"
    >
      {Object.entries(extra ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset>
        <legend className="mb-1.5 text-xs text-muted">Show</legend>
        <div className="flex gap-1 rounded-full bg-cream/70 p-1">
          <label className={tab}>
            <input type="radio" name="mode" value="day" defaultChecked={mode === "day"} className="sr-only" />
            One day
          </label>
          <label className={tab}>
            <input type="radio" name="mode" value="range" defaultChecked={mode === "range"} className="sr-only" />
            Date range
          </label>
        </div>
      </fieldset>

      <div className="hidden group-has-[input[value=day]:checked]:block">
        <label htmlFor={`${id}-day`} className="mb-1 block text-xs text-muted">Date</label>
        <input id={`${id}-day`} name="day" type="date" max={today} defaultValue={mode === "day" ? range.start : today} className={field} />
      </div>
      <div className="hidden gap-3 group-has-[input[value=range]:checked]:flex">
        <div>
          <label htmlFor={`${id}-from`} className="mb-1 block text-xs text-muted">From</label>
          <input id={`${id}-from`} name="from" type="date" max={today} defaultValue={range.start} className={field} />
        </div>
        <div>
          <label htmlFor={`${id}-to`} className="mb-1 block text-xs text-muted">To</label>
          <input id={`${id}-to`} name="to" type="date" max={today} defaultValue={range.end} className={field} />
        </div>
      </div>

      <button type="submit" className="h-10 rounded-full bg-brown px-5 text-sm font-medium text-ivory hover:bg-brown-deep">
        Show
      </button>
      <p className="w-full text-sm text-muted sm:ml-auto sm:w-auto sm:self-center">
        Showing <span className="font-medium text-charcoal">{describeSelection(selection)}</span>
      </p>
    </form>
  );
}

export function describeSelection({ mode, range }: Pick<HistorySelection, "mode" | "range">): string {
  return mode === "day" || range.start === range.end
    ? formatDate(range.start)
    : `${formatDate(range.start)} – ${formatDate(range.end)}`;
}

/**
 * Signed % change vs the previous period. Colour = direction × whether up is
 * good (costs going up is bad), always with an arrow and words, never colour alone.
 */
export function ChangeBadge({ value, upIsGood = true }: { value: number | null; upIsGood?: boolean }) {
  if (value === null) return <span className="text-xs text-muted">No earlier figures to compare</span>;
  const up = value > 0;
  const good = value === 0 ? null : up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        good === null ? "text-muted" : good ? "text-sage-deep" : "text-danger",
      )}
    >
      {value !== 0 && <Icon size={13} aria-hidden="true" />}
      {value > 0 ? "+" : ""}
      {value}% <span className="font-normal text-muted">vs previous period</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <dt className="text-xs text-muted sm:text-sm">{label}</dt>
      <dd className="mt-1.5">
        <span className="block text-2xl font-semibold text-charcoal sm:text-[1.7rem]">{value}</span>
        {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
        {children && <span className="mt-1 block">{children}</span>}
      </dd>
    </div>
  );
}

export function SampleDataNotice() {
  return (
    <p className="mb-6 flex items-start gap-2 rounded-lg bg-sage-soft/70 px-4 py-3 text-sm text-charcoal">
      <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-deep" />
      <span>
        <strong className="font-medium">Sample figures.</strong> The database isn&apos;t connected, so these sales,
        expenses and cost prices are made-up examples to show how the reports work. Real figures appear once sales
        and expenses are recorded.
      </span>
    </p>
  );
}

/**
 * Horizontal bars for one measure across categories (single hue, values
 * labelled directly, longest first). A list, so screen readers read
 * "label: value" without needing the bars.
 */
export function BarList({
  rows,
  format = money,
  emptyText = "Nothing in this period.",
}: {
  rows: Array<{ label: string; value: number; detail?: string }>;
  format?: (value: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  if (rows.length === 0 || max <= 0) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label} title={`${row.label}: ${format(row.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-charcoal">{row.label}</span>
            <span className="shrink-0 tabular-nums text-charcoal">
              {format(row.value)}
              {row.detail && <span className="ml-1.5 text-xs text-muted">{row.detail}</span>}
            </span>
          </div>
          <div className="h-2.5 w-full" aria-hidden="true">
            <div
              className="h-full rounded-r-[4px] bg-[#2a78d6]"
              style={{ width: `${Math.max(1.5, (Math.max(0, row.value) / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
