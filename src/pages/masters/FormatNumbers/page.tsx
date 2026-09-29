import { useMemo, useState } from "react";
import { Autocomplete, Button, Checkbox, Input, Label, ListBox, Select } from "@heroui/react";
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
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Format Number
              <Input
              placeholder="Enter format number"
              value={formatNumber}
              onChange={(event) => setFormatNumber(event.target.value)}
              required
              />
            </label>
            <Select
              selectedKey={formatType}
              onSelectionChange={(key) => {
                const value = key as FormatNumberType | undefined;
                if (value) setFormatType(value);
              }}
            >
              <Label>Format Type</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
              {FORMAT_TYPES.map((type) => (
                <ListBox.Item key={type.value} id={type.value} textValue={type.label}>
                  {type.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
              </ListBox></Select.Popover>
            </Select>
            <Autocomplete
              selectedKey={clientOrgId || null}
              onSelectionChange={(key) => {
                setClientOrgId((key as string) || null);
              }}
            >
              <Label>Client Organization (Optional)</Label>
              <Autocomplete.Trigger>
                <Autocomplete.Filter><Input placeholder={orgLoading ? "Loading organizations..." : "Select organization"} /></Autocomplete.Filter>
                <Autocomplete.Indicator />
              </Autocomplete.Trigger>
              <Autocomplete.Popover><ListBox>
              {organizations.map((org) => (
                <ListBox.Item key={org.id} id={org.id} textValue={org.name}>
                  {org.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
              </ListBox></Autocomplete.Popover>
            </Autocomplete>
            <div className="flex items-end">
              <Checkbox
                isSelected={isActive}
                onChange={setIsActive}
                className="mt-2"
              >
                Active
              </Checkbox>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onPress={handleSubmit}
              isDisabled={!formatNumber.trim() || isCreating}
            >
              {isCreating ? "Adding..." : "Add Format Number"}
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
