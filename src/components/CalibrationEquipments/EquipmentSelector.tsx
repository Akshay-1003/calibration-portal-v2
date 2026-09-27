import React, { useMemo } from "react";
import { Select, SelectItem } from "@heroui-v2/react";
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
      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">Equipment Details *</label>
      <Select
        className={className}
        placeholder="Select equipment"
        selectionMode="multiple"
        aria-label="Equipment Selector"
        selectedKeys={value}
        isLoading={loading || equipmentLoading}
        onSelectionChange={(keys) =>
          onChange(Array.from(keys) as string[])
        }
        variant="bordered"
        classNames={{
          trigger: `
          h-auto
          items-start
          py-2
        `,
          value: "w-full",
        }}
        renderValue={(items) => (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
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
                {item.textValue}
              </span>
            ))}
          </div>
        )}
      >
        {items.map((item) => (
          <SelectItem key={item.key} textValue={item.label}>
            <div className="text-sm">{item.label}</div>
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};

export default React.memo(EquipmentSelector);
