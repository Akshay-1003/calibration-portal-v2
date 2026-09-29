import React, { useCallback, useEffect, useState } from "react";
import { Autocomplete, Input, ListBox } from "@heroui/react";

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
  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  return (
    <div className={className}>
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        
        <Autocomplete
          selectedKey={selectedId ?? undefined}
          aria-label="Select gauge master"
          isInvalid={isInvalid}
          isDisabled={loading}
          onSelectionChange={(key) => handleSelect(key === null ? null : String(key))}
          className="w-full"
        >
          <Autocomplete.Trigger>
            <Autocomplete.Filter>
              <Input placeholder={placeholder} />
            </Autocomplete.Filter>
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover>
            <ListBox>
              {loading ? (
                <ListBox.Item id="loading" isDisabled>Loading gauge masters...</ListBox.Item>
              ) : gaugeMasterList.length === 0 ? (
                <ListBox.Item id="empty" isDisabled>No gauge masters found</ListBox.Item>
              ) : (
                gaugeMasterList.map((gauge) => (
                  <ListBox.Item key={gauge.id} id={gauge.id} textValue={gauge.name}>
                    {gauge.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))
              )}
            </ListBox>
          </Autocomplete.Popover>
        </Autocomplete>
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
