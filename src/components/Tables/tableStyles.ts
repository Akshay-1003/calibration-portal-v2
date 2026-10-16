import { cn } from "../../lib/utils";

const dataTableBaseClassName = [
  "!p-0 overflow-hidden rounded-md border border-slate-200 bg-white",
  "[&_[data-slot=table-scroll-container]]:max-w-full [&_[data-slot=table-scroll-container]]:overflow-x-auto [&_[data-slot=table-scroll-container]]:bg-white",
  "[&_[data-slot=table-content]]:min-w-max [&_[data-slot=table-content]]:w-full [&_[data-slot=table-content]]:table-auto [&_[data-slot=table-content]]:border-separate [&_[data-slot=table-content]]:border-spacing-0",
  "[&_[data-slot=table-header]]:sticky [&_[data-slot=table-header]]:top-0 [&_[data-slot=table-header]]:z-20 [&_[data-slot=table-header]]:bg-slate-100 [&_[data-slot=table-header]]:border-b [&_[data-slot=table-header]]:border-slate-200",
  "[&_[data-slot=table-column]]:h-11 [&_[data-slot=table-column]]:whitespace-nowrap [&_[data-slot=table-column]]:px-4 [&_[data-slot=table-column]]:py-3",
  "[&_[data-slot=table-column]]:text-xs [&_[data-slot=table-column]]:font-semibold [&_[data-slot=table-column]]:tracking-normal [&_[data-slot=table-column]]:text-slate-700",
  "[&_[data-slot=table-row]]:border-0",
  "[&_[data-slot=table-cell]]:whitespace-nowrap [&_[data-slot=table-cell]]:border-0 [&_[data-slot=table-cell]]:px-4 [&_[data-slot=table-cell]]:py-3 [&_[data-slot=table-cell]]:text-sm [&_[data-slot=table-cell]]:text-slate-700",
  "[&_[data-slot=table-cell]]:align-middle",
].join(" ");

export const dataTableClassName = (className?: string) =>
  cn(dataTableBaseClassName, className);
