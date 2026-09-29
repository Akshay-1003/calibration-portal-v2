import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label, ListBox, Popover } from "@heroui/react";
import { useEquipmentsWithQuery } from "../../hooks/useEquipmentsWithQuery";

type Equipment = {
  id: string;
  equipment_name?: string;
  code_no?: string;
  size_range?: string;
};

interface EquipmentSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  className?: string;
}

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  value,
  onChange,
  loading = false,
  className,
}) => {
  const { equipments, loading: equipmentLoading } = useEquipmentsWithQuery();
  const [isOpen, setIsOpen] = useState(false);

  const items = useMemo(
    () =>
      equipments.map((e: Equipment) => ({
        key: e.id,
        label: `${e.equipment_name} | ${e.code_no} | ${e.size_range}`,
      })),
    [equipments]
  );

  return (
    <div className="">
      <div className={className}>
        <Label className="mb-1.5 block text-xs font-semibold uppercase text-gray-700">Equipment Details *</Label>
        <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger>
            <button
              type="button"
              className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Equipment Selector"
              disabled={loading || equipmentLoading}
            >
              <div className="flex w-full flex-wrap gap-2">
                {items.filter((item) => value.includes(item.key)).map((item) => (
              <span
                key={item.key}
                className="
                inline-flex items-center
                px-3 py-1
                rounded-full
                text-xs font-medium
                bg-blue-50
                text-blue-700
                border border-blue-200
                whitespace-nowrap
              "
              >
                {item.label}
              </span>
                ))}
                {value.length === 0 && <span className="text-sm text-gray-500">Select equipment</span>}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            </button>
          </Popover.Trigger>
          <Popover.Content className="min-w-[320px]">
            <Popover.Dialog>
              <ListBox
                items={items}
                selectionMode="multiple"
                selectedKeys={new Set(value)}
                onSelectionChange={(keys) => {
                  if (keys === 'all') {
                    onChange(items.map((item) => item.key));
                  } else {
                    onChange(Array.from(keys, String));
                  }
                }}
              >
                {(item) => (
                  <ListBox.Item id={item.key} textValue={item.label}>
                    <div className="text-sm">{item.label}</div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                )}
              </ListBox>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );
};

export default React.memo(EquipmentSelector);
