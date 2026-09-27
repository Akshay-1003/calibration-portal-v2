import { useMemo, useState } from "react";
import { Input, Button, Select, SelectItem, Checkbox, Autocomplete, AutocompleteItem } from "@heroui-v2/react";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import FormatNumberListTable from "../../../components/Tables/FormatNumberListTable";
import { useFormatNumbers } from "../../../hooks/useFormatNumbers";
import { useOrganizationsWithQuery } from "../../../hooks/useOrganizationsWithQuery";
import type { CreateFormatNumberPayload, FormatNumberType } from "../../../types/formatNumber";

const FORMAT_TYPES: { label: string; value: FormatNumberType }[] = [
  { label: "Certificate", value: "certificate" },
  { label: "Inward", value: "inward" },
  { label: "Outward", value: "outward" },
  { label: "Customer", value: "customer" },
];

const FormatNumbersPage = () => {
  const [formatNumber, setFormatNumber] = useState("");
  const [formatType, setFormatType] = useState<FormatNumberType>("certificate");
  const [isActive, setIsActive] = useState(true);
  const [clientOrgId, setClientOrgId] = useState<string | null>(null);

  const {
    formatNumbers,
    loading,
    error,
    createFormatNumber,
    deleteFormatNumber,
    refetch,
    isCreating,
  } = useFormatNumbers();

  const { organizations, loading: orgLoading } = useOrganizationsWithQuery();

  const organizationMap = useMemo(() => {
    return organizations.reduce<Record<string, string>>((acc, org) => {
      acc[org.id] = org.name;
      return acc;
    }, {});
  }, [organizations]);

  const handleSubmit = async () => {
    if (!formatNumber.trim()) return;
    const payload: CreateFormatNumberPayload = {
      formatNumber: formatNumber.trim(),
      formatType,
      isActive,
      clientOrgId: clientOrgId || null,
    };

    await createFormatNumber(payload);
    setFormatNumber("");
    setFormatType("certificate");
    setIsActive(true);
    setClientOrgId(null);
  };

  return (
    <TablePageWrapper
      title="Format Numbers"
      description="Create and manage format numbers for certificates, inward, outward, and customers"
      layout="filter"
      filters={
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Format Number"
              labelPlacement="outside"
              placeholder="Enter format number"
              value={formatNumber}
              onValueChange={setFormatNumber}
              isRequired
            />
            <Select
              label="Format Type"
              labelPlacement="outside"
              selectedKeys={[formatType]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as FormatNumberType | undefined;
                if (value) setFormatType(value);
              }}
            >
              {FORMAT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
            <Autocomplete
              label="Client Organization (Optional)"
              labelPlacement="outside"
              placeholder="Select organization"
              selectedKey={clientOrgId || null}
              onSelectionChange={(key) => {
                setClientOrgId((key as string) || null);
              }}
              allowsCustomValue={false}
              isLoading={orgLoading}
            >
              {organizations.map((org) => (
                <AutocompleteItem key={org.id} textValue={org.name}>
                  {org.name}
                </AutocompleteItem>
              ))}
            </Autocomplete>
            <div className="flex items-end">
              <Checkbox
                isSelected={isActive}
                onValueChange={setIsActive}
                className="mt-2"
              >
                Active
              </Checkbox>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              color="primary"
              onPress={handleSubmit}
              isDisabled={!formatNumber.trim() || isCreating}
              isLoading={isCreating}
            >
              Add Format Number
            </Button>
          </div>
        </div>
      }
      table={
        <FormatNumberListTable
          data={formatNumbers}
          organizationMap={organizationMap}
          onDelete={deleteFormatNumber}
          loading={loading}
          error={error}
          onRefresh={refetch}
        />
      }
    />
  );
};

export default FormatNumbersPage;
