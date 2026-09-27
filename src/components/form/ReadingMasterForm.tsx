"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Input,
  Button,
  Card,
  CardHeader,
  CardBody,
  Checkbox,
  Autocomplete,
  AutocompleteItem,
} from "@heroui-v2/react";
import { Plus, Trash, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useGaugeStore } from "../../store/gaugeStore";
import { useReadingMasterStore } from "../../store/readingMasterStore";

/**
 * No formatting - returns value as-is
 * Allows up to 4 decimal places for positive or negative numbers
 */
const formatReadingNumber = (value: string | number): string => {
  if (!value && value !== 0) return "";
  return String(value);
};

interface ReadingItem {
  id: string;
  value: string;
  isExisting?: boolean; // Track if this reading existed before
  originalValue?: number; // Original value for comparison
}

interface ReadingMasterFormProps {
  mode?: "create" | "edit";
  gaugeId?: string;
  initialData?: { readings: number[] };
  onSuccess?: () => void;
}

// Sortable Row Component
function SortableRow({
  item,
  index,
  onUpdate,
  onDelete,
  isDisabled,
}: {
  item: ReadingItem;
  index: number;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  isDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleChange = (value: string) => {
    // Validate input: allow negative sign, numbers, and one decimal point
    if (value === "" || value === "-" || /^-?\d*\.?\d*$/.test(value)) {
      const [whole, decimal] = value.split(".");
      // Allow up to 8 digits in whole part (excluding negative sign) and up to 3 decimal places
      const wholeDigits = whole.replace("-", "");
      if (wholeDigits.length <= 8 && (!decimal || decimal.length <= 4)) {
        onUpdate(item.id, value);
      }
    }
  };

  const handleBlur = () => {
    // No formatting on blur - keep the value as entered by user
    // Just validate it's a valid number
    if (item.value && item.value.trim() !== "" && item.value !== "-") {
      const num = Number(item.value);
      if (isNaN(num)) {
        // If invalid number, clear it
        onUpdate(item.id, "");
      }
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 ${isDragging ? "z-50 opacity-50 bg-gray-50" : "hover:bg-gray-50"}`}
    >
      <td className="p-2 w-12">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Drag to reorder"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </button>
          <span className="text-sm text-gray-500 min-w-[20px]">{index + 1}</span>
        </div>
      </td>
      <td className="p-2">
        <Input
          size="sm"
          value={item.value}
          placeholder="0.0000"
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          isDisabled={isDisabled}
          description="Enter a number with up to 4 decimals (e.g., 0.1234, 75.5678, -12.3456)"
        />
      </td>
      <td className="p-2">
        <Button
          size="sm"
          color="danger"
          isIconOnly
          onPress={() => onDelete(item.id)}
          isDisabled={isDisabled}
        >
          <Trash size={16} />
        </Button>
      </td>
    </tr>
  );
}

export default function ReadingMasterForm({
  mode = "create",
  gaugeId,
  initialData,
  onSuccess,
}: ReadingMasterFormProps) {
  const { gaugeMasterList, fetchGauges, loading: gaugeLoading } = useGaugeStore();
  const {
    actions: readingMasterActions,
    currentReadingMaster,
    currentLoading,
  } = useReadingMasterStore();

  const [masterGaugeId, setMasterGaugeId] = useState(gaugeId || "");
  const [readings, setReadings] = useState<ReadingItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [originalOrder, setOriginalOrder] = useState<number[]>([]); // Track original order for comparison
  const [isStatic, setIsStatic] = useState(true);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /* ---------------- Load Gauge List ---------------- */
  useEffect(() => {
    if (gaugeMasterList.length === 0) {
      fetchGauges();
    }
  }, [fetchGauges, gaugeMasterList.length]);

  /* ---------------- Load Existing Readings for Edit ---------------- */
  useEffect(() => {
    if (mode === "edit" && masterGaugeId) {
      readingMasterActions.fetchByGaugeId(masterGaugeId);
    }
  }, [mode, masterGaugeId, readingMasterActions]);

  /* ---------------- Sync Current Reading Master to Form ---------------- */
  useEffect(() => {
    if (mode === "edit" && currentReadingMaster && masterGaugeId === currentReadingMaster.master_gauge_id) {
      // Format readings and mark as existing
      const formattedReadings: ReadingItem[] = currentReadingMaster.readings.map((r, idx) => ({
        id: `existing-${idx}`,
        value: formatReadingNumber(r),
        isExisting: true,
        originalValue: r,
      }));
      setReadings(formattedReadings.length > 0 ? formattedReadings : []);
      setNextId(formattedReadings.length);
      // Store original order for comparison
      setOriginalOrder([...currentReadingMaster.readings]);
      setIsStatic(currentReadingMaster.is_static ?? true);
    } else if (mode === "create" && initialData?.readings) {
      // Handle initial data for create mode
      const formattedReadings: ReadingItem[] = initialData.readings.map((r, idx) => ({
        id: `initial-${idx}`,
        value: formatReadingNumber(r),
        isExisting: false,
      }));
      setReadings(formattedReadings);
      setNextId(formattedReadings.length);
      setOriginalOrder([]);
      setIsStatic(true);
    } else if (mode === "create") {
      setOriginalOrder([]);
      setIsStatic(true);
    }
  }, [mode, currentReadingMaster, masterGaugeId, initialData]);

  /* ---------------- Add Empty Row ---------------- */
  const addRow = useCallback(() => {
    if (!masterGaugeId) {
      toast.error("Select master gauge first");
      return;
    }
    const newItem: ReadingItem = {
      id: `new-${nextId}`,
      value: "",
      isExisting: false,
    };
    setReadings((prev) => [...prev, newItem]);
    setNextId((prev) => prev + 1);
  }, [masterGaugeId, nextId]);

  /* ---------------- Update Reading ---------------- */
  const updateReading = useCallback((id: string, value: string) => {
    setReadings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value } : item))
    );
  }, []);

  /* ---------------- Delete Row ---------------- */
  const deleteRow = useCallback(
    async (id: string) => {
      const item = readings.find((r) => r.id === id);
      
      // If editing and has an existing reading, remove from server
      if (
        mode === "edit" &&
        currentReadingMaster?.id &&
        item?.isExisting &&
        item.originalValue !== undefined
      ) {
        try {
          await readingMasterActions.removeReading(
            currentReadingMaster.id,
            item.originalValue
          );
        } catch {
          // Error already handled in store
        }
      }

      setReadings((prev) => prev.filter((item) => item.id !== id));
    },
    [readings, mode, currentReadingMaster, readingMasterActions]
  );

  /* ---------------- Handle Drag End ---------------- */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReadings((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  /* ---------------- Submit Handler ---------------- */
  const handleSubmit = useCallback(async () => {
    if (!masterGaugeId) {
      toast.error("Please select a master gauge");
      return;
    }

    // Clean and validate readings (allow negative numbers with up to 4 decimal places)
    const cleanedReadings = readings
      .map((r) => r.value.trim())
      .filter((r) => r !== "" && /^-?\d{1,8}(\.\d{1,4})?$/.test(r))
      .map(Number)
      .filter((n) => !isNaN(n));

    if (cleanedReadings.length === 0) {
      toast.error("Add at least one valid reading");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        // Create new reading master
        const result = await readingMasterActions.create({
          master_gauge_id: masterGaugeId,
          readings: cleanedReadings,
          is_static: isStatic,
        });

        if (result) {
          setReadings([]);
          setMasterGaugeId("");
          setNextId(1);
          onSuccess?.();
        }
      } 
      else {
        // Edit mode: handle new vs existing readings with order preservation
        if (!currentReadingMaster?.id) {
          toast.error("Reading master not found");
          setIsSubmitting(false);
          return;
        }

        const originalIsStatic = currentReadingMaster.is_static ?? true;
        const isStaticChanged = originalIsStatic !== isStatic;

        // Check if order changed by comparing arrays
        const orderChanged = 
          originalOrder.length !== cleanedReadings.length ||
          originalOrder.some((val, idx) => val !== cleanedReadings[idx]);

        const existingValues = new Set(
          currentReadingMaster.readings.map(Number)
        );
        const newReadings = cleanedReadings.filter(
          (r) => !existingValues.has(r)
        );

        // Track which existing readings were removed
        const currentValues = new Set(cleanedReadings);
        const removedReadings = currentReadingMaster.readings.filter(
          (r) => !currentValues.has(Number(r))
        );

        // If order changed, readings changed, or is_static changed, update via PUT
        if (orderChanged || newReadings.length > 0 || removedReadings.length > 0 || isStaticChanged) {
          const result = await readingMasterActions.update(currentReadingMaster.id, {
            readings: cleanedReadings,
            is_static: isStatic,
          });

          if (result) {
            setOriginalOrder([...cleanedReadings]);
            setReadings([]);
            setMasterGaugeId("");
            setNextId(1);
            onSuccess?.();
          }
        } else {
          toast.info("No changes to save");
          onSuccess?.();
        }
      }
    } catch (error) {
      console.error("Error saving readings:", error);
      // Error toast already shown by store
    } finally {
      setIsSubmitting(false);
    }
  }, [
    masterGaugeId,
    readings,
    isStatic,
    mode,
    currentReadingMaster,
    originalOrder,
    readingMasterActions,
    onSuccess,
  ]);

  const gaugeOptions = useMemo(
    () =>
      gaugeMasterList.map((g) => ({
        value: g.id,
        label: g.name,
      })),
    [gaugeMasterList]
  );

  const isLoading = gaugeLoading || currentLoading || isSubmitting;
  const readingIds = useMemo(() => readings.map((r) => r.id), [readings]);

  return (
    <Card className="shadow-md border bg-card rounded-xl overflow-hidden">
      <CardHeader className="bg-blue-600 text-white px-6 py-4 rounded-t-xl">
        <h3 className="text-xl font-semibold text-white tracking-tight">
          {mode === "edit" ? "Edit Reading Master" : "Reading Master"}
        </h3>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Gauge Selection */}
        <div className="mt-2">
          <Autocomplete
            key={masterGaugeId}
            selectedKey={masterGaugeId || null}
            isLoading={gaugeLoading}
            isDisabled={mode === "edit" || isLoading}
            label="Select Master Gauge"
            labelPlacement="outside"
            placeholder="Select Master Gauge"
            aria-label="Select Master Gauge"
            onSelectionChange={(key) => {
              setMasterGaugeId((key as string) || "");
            }}
            // size="sm"
          >
            {gaugeOptions.map((o) => (
              <AutocompleteItem key={o.value}>
                {o.label}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>

        {/* is_static selection */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <Checkbox
              isSelected={isStatic}
              onValueChange={() => setIsStatic(true)}
            >
              Fix
            </Checkbox>
            <Checkbox
              isSelected={!isStatic}
              onValueChange={() => setIsStatic(false)}
            >
              Dynamic
            </Checkbox>
          </div>
        </div>

        {/* Readings Table */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <h4 className="font-medium">Readings ({readings.length})</h4>
            <Button
              size="sm"
              startContent={<Plus />}
              onPress={addRow}
              isDisabled={!masterGaugeId || isLoading}
            >
              Add Row
            </Button>
          </div>

          {readings.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Add empty rows first, then fill values
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={readingIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-sm w-12">Sr</th>
                        <th className="text-left p-2 font-semibold text-sm">Value</th>
                        <th className="text-left p-2 font-semibold text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((item, index) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          index={index}
                          onUpdate={updateReading}
                          onDelete={deleteRow}
                          isDisabled={isLoading}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Submit Button */}
        <Button
          color="primary"
          fullWidth
          size="lg"
          onPress={handleSubmit}
          isLoading={isLoading}
          isDisabled={!masterGaugeId || readings.length === 0 || isLoading}
        >
          {mode === "edit" ? "Update Readings" : "Create Record"}
        </Button>
      </CardBody>
    </Card>
  );
}
