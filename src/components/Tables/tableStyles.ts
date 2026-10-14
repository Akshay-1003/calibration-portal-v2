import { cn } from "../../lib/utils";

const dataTableBaseClassName = [
  "overflow-hidden rounded-md border border-default-200 bg-white shadow-sm",
  "[&_[data-slot=table-scroll-container]]:bg-white",
  "[&_[data-slot=table-content]]:w-full [&_[data-slot=table-content]]:border-separate [&_[data-slot=table-content]]:border-spacing-0",
  "[&_[data-slot=table-header]]:bg-default-50",
  "[&_[data-slot=table-column]]:h-11 [&_[data-slot=table-column]]:px-4 [&_[data-slot=table-column]]:py-3",
  "[&_[data-slot=table-column]]:text-xs [&_[data-slot=table-column]]:font-semibold [&_[data-slot=table-column]]:uppercase [&_[data-slot=table-column]]:tracking-normal [&_[data-slot=table-column]]:text-default-600",
  "[&_[data-slot=table-row]]:border-b [&_[data-slot=table-row]]:border-default-200/80",
  "[&_[data-slot=table-cell]]:px-4 [&_[data-slot=table-cell]]:py-3 [&_[data-slot=table-cell]]:text-sm [&_[data-slot=table-cell]]:text-default-700",
  "[&_[data-slot=table-cell]]:align-middle",
].join(" ");

export const dataTableClassName = (className?: string) =>
  cn(dataTableBaseClassName, className);
