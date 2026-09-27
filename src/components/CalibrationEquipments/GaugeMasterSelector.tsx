import React, { useCallback, useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Input } from "@heroui/react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { cn } from "../../lib/utils";

export interface GaugeMaster {
  id: string;
  name: string;
  [key: string]: any;
}

export interface GaugeMasterSelectorProps {
  /** Initial selected gauge master id */
  initialSelectedId?: string | null;
  /** Callback when selection changes */
  onChange?: (id: string | null) => void;
  /** List of gauge masters to choose from */
  gaugeMasterList: GaugeMaster[];
  /** Optional class name for root container */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Label for the selector */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Error state */
  isInvalid?: boolean;
  /** Error message */
  errorMessage?: string;
}

/** Gauge Master single-select with search functionality */
export const GaugeMasterSelector: React.FC<GaugeMasterSelectorProps> = React.memo(({ 
  initialSelectedId = null, 
  onChange, 
  gaugeMasterList = [],
  className,
  loading = false,
  label = "Master Gauge",
  placeholder = "Search and select Master Gauge",
  isInvalid = false,
  errorMessage
}) => {
  void loading;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Sync initialSelectedId when it changes externally (e.g., from parent)
  useEffect(() => {
    setSelectedId(initialSelectedId);
  }, [initialSelectedId]);

  // Use ref to store onChange callback to avoid infinite loops
  const onChangeRef = React.useRef(onChange);
  
  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Use ref to track previous selectedId to avoid unnecessary calls
  const prevSelectedIdRef = React.useRef<string | null>(selectedId);
  
  useEffect(() => {
    // Only call onChange if selectedId actually changed
    if (prevSelectedIdRef.current !== selectedId && onChangeRef.current) {
      prevSelectedIdRef.current = selectedId;
      onChangeRef.current(selectedId);
    }
  }, [selectedId]);

  // Filter gauge masters based on search query
  const filteredGaugeMasters = useMemo(() => {
    if (!searchQuery.trim()) return gaugeMasterList;
    const query = searchQuery.toLowerCase();
    return gaugeMasterList.filter((gauge) => 
      gauge.name?.toLowerCase().includes(query)
    );
  }, [gaugeMasterList, searchQuery]);
  void filteredGaugeMasters;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setIsOpen(false);
    setSearchQuery("");
  }, []);
  void handleSelect;

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(null);
    setSearchQuery("");
  }, []);

  const selectedGauge = useMemo(() => {
    return gaugeMasterList.find(g => g.id === selectedId);
  }, [gaugeMasterList, selectedId]);

  return (
    <div className={className}>
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        
        {/* Selector Trigger */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div
              className={cn(
                "w-full min-h-[40px] py-2 px-3 border rounded-md bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors",
                isInvalid ? "border-red-500" : "border-gray-300"
              )}
              role="combobox"
              aria-expanded={isOpen}
              aria-label="Select gauge master"
            >
              <div className="flex-1 text-left min-w-0">
                {selectedGauge ? (
                  <span className="text-sm text-gray-900 truncate">
                    {selectedGauge.name}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">{placeholder}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {selectedId && (
                  <button
                    onClick={handleClear}
                    className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                    aria-label="Clear selection"
                    type="button"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                <svg
                  className={cn(
                    "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                    isOpen && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[400px] max-w-[600px] rounded-lg overflow-hidden border border-gray-200 shadow-lg bg-white" 
            align="start" 
            sideOffset={4}
          >
            <div className="w-full">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
                <Input
                  placeholder="Search gauge masters..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  classNames={{
                    input: "text-sm",
                    inputWrapper: "h-9",
                  }}
                  startContent={
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Error Message */}
        {isInvalid && errorMessage && (
          <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
        )}
      </div>
    </div>
  );
});

GaugeMasterSelector.displayName = "GaugeMasterSelector";

export default GaugeMasterSelector;
