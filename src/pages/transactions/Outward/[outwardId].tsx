import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import { ArrowLeftIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { transformOutwardToChalanData } from "../../../components/chalan/chalanUtils";
import { printOutwardChalan } from "../../../utils/outwardChalanPrint";

import {
  Table,
  Input,
  Card,
  ListBox,
  Select,
  Tabs,
  Chip,
} from "@heroui/react";
import { useOutwardStore, type OutwardGaugeItem, type InwardedGaugeItem } from "../../../store/outwardStore";
import { useInvoiceStore } from "../../../store/invoiceStore";
import { Loader } from "../../../components/ui/loader/loader";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";
import { dataTableClassName } from "../../../components/Tables/tableStyles";

const OutwardDetailPage = React.memo(() => {
  const navigate = useNavigate();
  const { outwardId } = useParams<{ outwardId: string }>();

  // Store state and actions
  const {
    outwardEntry,
    outwardItems,
    inwardedItems,
    loading,
    outwardItemsSearch,
    inwardedItemsSearch,
    selectedInwardedKeys,
    addingGaugeId,
    removingGaugeIds,
    addStatusConfirmOpen,
    pendingAddItems,
    setOutwardItemsSearch,
    setInwardedItemsSearch,
    setSelectedInwardedKeys,
    openAddStatusConfirm,
    closeAddStatusConfirm,
    fetchOutwardEntry,
    fetchOutwardItems,
    fetchInwardedItems,
    addGaugeToOutward,
    bulkAddGaugesToOutward,
    removeGaugeFromOutward,
    getItemKey,
    resetStore,
  } = useOutwardStore();

  const { fetchInvoiceDraft } = useInvoiceStore.getState();


  // Selected outward items for invoice
  const [selectedOutwardItems, setSelectedOutwardItems] = React.useState<Set<string> | 'all'>(new Set());
  const [activeTab, setActiveTab] = useState<'outwardItems' | 'inwardedItems'>('outwardItems');

  // Initial data fetch
  useEffect(() => {
    if (!outwardId) {
      toast.error("No outward ID provided");
      navigate("/transactions/outward");
      return;
    }

    const loadData = async () => {
      try {
        await Promise.all([
          fetchOutwardEntry(outwardId),
          fetchOutwardItems(outwardId),
          fetchInwardedItems(outwardId),
        ]);
      } catch (err) {
        console.error("Error loading outward data:", err);
        navigate("/transactions/outward");
      }
    };

    loadData();

    sessionStorage.removeItem('outwardInvoiceData');

    // Cleanup on unmount
    return () => {
      resetStore();
    };
  }, [outwardId, navigate, fetchOutwardEntry, fetchOutwardItems, fetchInwardedItems, resetStore]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    navigate("/transactions/outward");
  }, [navigate]);

  // Helper function to get searchable text from an item
  const getSearchableText = useCallback((item: OutwardGaugeItem | InwardedGaugeItem): string => {
    return Object.values(item)
      .filter((value) => typeof value === "string" || typeof value === "number")
      .map((value) => String(value).toLowerCase())
      .join(" ");
  }, []);

  // Filter outward items
  const filteredOutwardItems = useMemo(() => {
    if (!outwardItemsSearch.trim()) return outwardItems;
    const searchLower = outwardItemsSearch.toLowerCase();
    return outwardItems.filter((item) => {
      return getSearchableText(item).includes(searchLower);
    });
  }, [outwardItems, outwardItemsSearch, getSearchableText]);

  // Resolve outward item selection for actions (invoice/chalan)
  const getSelectedOutwardItemsForAction = useCallback(
    (options?: { includeAllWhenNone?: boolean }): OutwardGaugeItem[] => {
      if (selectedOutwardItems === 'all') {
        return filteredOutwardItems;
      }

      if (selectedOutwardItems.size === 0) {
        return options?.includeAllWhenNone ? filteredOutwardItems : [];
      }

      return filteredOutwardItems.filter((item) => {
        const key = getItemKey(item, filteredOutwardItems.indexOf(item));
        return selectedOutwardItems.has(key);
      });
    },
    [filteredOutwardItems, getItemKey, selectedOutwardItems],
  );

  // Filter inwarded items
  const filteredInwardedItems = useMemo(() => {
    if (!inwardedItemsSearch.trim()) return inwardedItems;
    const searchLower = inwardedItemsSearch.toLowerCase();
    return inwardedItems.filter((item) => {
      return getSearchableText(item).includes(searchLower);
    });
  }, [inwardedItems, inwardedItemsSearch, getSearchableText]);

  useEffect(() => {
    setSelectedOutwardItems((prev) => {
      if (prev === "all") {
        return filteredOutwardItems.length === 0 ? new Set() : prev;
      }

      const validKeys = new Set(
        filteredOutwardItems.map((item, index) => getItemKey(item, index))
      );
      const nextSelection = new Set(
        Array.from(prev).filter((key) => validKeys.has(key))
      );

      return nextSelection.size === prev.size ? prev : nextSelection;
    });
  }, [filteredOutwardItems, getItemKey]);

  // Format outward date - handles both outwardDate and dispatchDate fields
  const outwardDate = useMemo(() => {
    if (!outwardEntry) return "N/A";

    return outwardEntry.outward_date ? new Date(outwardEntry.outward_date).toLocaleDateString() : "N/A";
  }, [outwardEntry]);

  const renderStatusChip = useCallback((status?: string) => {
    if (!status) {
      return (
        <Chip color="default" variant="soft" size="sm">
          Unknown
        </Chip>
      );
    }

    const statusLabel = status.replace(/_/g, " ");

    if (status === "calibration_completed") {
      return (
        <Chip color="success" variant="soft" size="sm" className="capitalize">
          {statusLabel}
        </Chip>
      );
    }

    return (
      <Chip color="warning" variant="soft" size="sm" className="capitalize">
        {statusLabel}
      </Chip>
    );
  }, []);

  const handlePrint = useCallback(() => {
    if (!outwardEntry) {
      toast.error("Please wait for data to load");
      return;
    }

    const itemsForChalan = getSelectedOutwardItemsForAction({ includeAllWhenNone: true });
    if (itemsForChalan.length === 0) {
      toast.error("No outward items available for chalan");
      return;
    }

    try {
      const transformedData = transformOutwardToChalanData(outwardEntry, itemsForChalan);
      printOutwardChalan(transformedData);
    } catch (error) {
      console.error("Error printing chalan:", error);
      toast.error("Failed to print chalan");
    }
  }, [getSelectedOutwardItemsForAction, outwardEntry]);


  // Handle adding a single gauge to outward
  const handleAddGauge = useCallback(async (item: InwardedGaugeItem) => {
    if (!outwardId) {
      toast.error("Outward ID is required");
      return;
    }

    if (item.status === "inward_received") {
      openAddStatusConfirm([item]);
      return;
    }

    try {
      await addGaugeToOutward(outwardId, item);
    } catch (err) {
      // Error is already handled in the store
      console.error("Error adding gauge:", err);
    }
  }, [outwardId, addGaugeToOutward, openAddStatusConfirm]);

  // Handle bulk adding multiple gauges to outward
  const handleBulkAddGauges = useCallback(async () => {
    if (!outwardId) {
      toast.error("Outward ID is required");
      return;
    }

    let itemsToAdd: InwardedGaugeItem[] = [];

    if (selectedInwardedKeys === "all") {
      itemsToAdd = filteredInwardedItems;
    } else if (selectedInwardedKeys.size === 0) {
      toast.error("Please select at least one item");
      return;
    } else {
      // Get selected items
      itemsToAdd = filteredInwardedItems.filter((item) => {
        const key = getItemKey(item, filteredInwardedItems.indexOf(item));
        return selectedInwardedKeys.has(key);
      });
    }

    if (itemsToAdd.length === 0) {
      toast.error("No items to add");
      return;
    }

    const inwardReceivedItems = itemsToAdd.filter((item) => item.status === "inward_received");
    if (inwardReceivedItems.length > 0) {
      openAddStatusConfirm(itemsToAdd);
      return;
    }

    try {
      await bulkAddGaugesToOutward(outwardId, itemsToAdd);
    } catch (err) {
      // Error is already handled in the store
      console.error("Error bulk adding gauges:", err);
    }
  }, [outwardId, selectedInwardedKeys, filteredInwardedItems, getItemKey, bulkAddGaugesToOutward, openAddStatusConfirm]);

  const handleConfirmPendingStatusAdd = useCallback(async () => {
    if (!outwardId || pendingAddItems.length === 0) {
      closeAddStatusConfirm();
      return;
    }

    try {
      if (pendingAddItems.length === 1) {
        await addGaugeToOutward(outwardId, pendingAddItems[0]);
      } else {
        await bulkAddGaugesToOutward(outwardId, pendingAddItems);
      }
    } finally {
      closeAddStatusConfirm();
    }
  }, [addGaugeToOutward, bulkAddGaugesToOutward, closeAddStatusConfirm, outwardId, pendingAddItems]);

  // Handle removing a gauge from outward
  const handleRemoveGaugeFromOutward = useCallback(async (item: OutwardGaugeItem) => {
    if (!outwardId) {
      toast.error("Outward ID is required");
      return;
    }

    if (!item.gauge_inward_id) {
      toast.error("Gauge inward ID is required");
      return;
    }

    try {
      const itemKey = getItemKey(item, filteredOutwardItems.indexOf(item));
      setSelectedOutwardItems((prev) => {
        if (prev === "all" || !prev.has(itemKey)) {
          return prev;
        }

        const nextSelection = new Set(prev);
        nextSelection.delete(itemKey);
        return nextSelection;
      });

      await removeGaugeFromOutward(outwardId, item.gauge_inward_id);
    } catch (err) {
      // Error is already handled in the store
      console.error("Error removing gauge from outward:", err);
    }
  }, [filteredOutwardItems, getItemKey, outwardId, removeGaugeFromOutward]);

  // TODO: Temporarily disabled.
  // Invoice creation will be initiated from Billing > Invoice module.
  // This flow may be re-enabled in the future.
  // Handle start invoice process - create invoice and navigate to invoice creation page
  const handleStartInvoiceProcess = useCallback(async () => {
    if (!outwardEntry || filteredOutwardItems.length === 0) {
      toast.error('Please wait for data to load');
      return;
    }

    const itemsToInvoice = getSelectedOutwardItemsForAction();
    if (itemsToInvoice.length === 0) {
      toast.error('No items selected for invoice');
      return;
    }

    // Check if all items are selected
    const isAllSelected = selectedOutwardItems === 'all' || 
      (typeof selectedOutwardItems === 'object' && selectedOutwardItems.size === filteredOutwardItems.length);

    try {
      // Prepare API payload
      let apiPayload: {
        client_org_id: string;
        outward_id?: string;
        gauge_inward_ids?: string[];
      };

      if (isAllSelected) {
        // If all items selected, send only outward_id
        apiPayload = {
          client_org_id: outwardEntry.client_org_id || '',
          outward_id: outwardEntry.id || outwardEntry.outward_no || '',
        };
      } else {
        // If partial selection, send only gauge_inward_ids
        const gaugeInwardIds = itemsToInvoice
          .map((item) => item.gauge_inward_id)
          .filter((id): id is string => Boolean(id));

        if (gaugeInwardIds.length === 0) {
          toast.error('No valid gauge identifiers found');
          return;
        }

        apiPayload = {
          client_org_id: outwardEntry.client_org_id || '',
          gauge_inward_ids: gaugeInwardIds,
        };
      }

      // Make POST API call to create invoice
      const createdInvoice = await fetchInvoiceDraft(apiPayload);

      // Navigate to invoice creation page with created invoice ID
      navigate(`/transactions/outward/create-outward-invoice/${createdInvoice.id}/${outwardEntry.id}/${outwardEntry.outward_no}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    }
  }, [filteredOutwardItems, getSelectedOutwardItemsForAction, navigate, outwardEntry, selectedOutwardItems]);
  void handleStartInvoiceProcess;

  return (
    <>
      <TablePageWrapper
        pageTitle={`Outward`}
        title={<>
          <h1 className="text-lg font-semibold mb-1">Clinet Name: {outwardEntry?.client_org ?? "N/A"}</h1>
          <span className="text-gray-700 text-base font-md"> Outward No.: <Badge className="bg-blue-100 text-blue-700 text-md">{outwardEntry?.outward_no ?? "N/A"}</Badge> </span>
          <span className="text-gray-700 text-base font-md"> Outward Date: <Badge className="bg-blue-100 text-blue-700 text-md">{outwardDate}</Badge> </span>

        </>}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </Button>

          </div>
        }
      >


        <div className="flex w-full flex-col">
          <Tabs
            aria-label="Outward item views"
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(String(key) as 'outwardItems' | 'inwardedItems')}
            variant="secondary"
            className="w-full"
          >
            <Tabs.ListContainer className="w-full rounded-xl border border-slate-200 bg-slate-100 p-1">
              <Tabs.List aria-label="Outward item views" className="grid w-full grid-cols-2 gap-1">
              <Tabs.Tab id="outwardItems">OUTWARD ITEMS FROM THIS CHALAN</Tabs.Tab>
              <Tabs.Tab id="inwardedItems">INWARDED ITEMS</Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="outwardItems">
              <Card>
                <Card.Header className="flex justify-between items-center bg-blue-600 text-white">
                  <h3 className="text-md font-semibold">OUTWARD ITEMS FROM THIS CHALAN</h3>
                </Card.Header>
                <Card.Content>
                  <div className="flex justify-between items-center mb-4">

                    <div className="flex-1 items-center">
                      <Input
                        className="w-full sm:max-w-xs"
                        placeholder="Search..."
                        value={outwardItemsSearch}
                        onChange={(event) => setOutwardItemsSearch(event.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handlePrint}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                      >
                        <PrinterIcon className="w-4 h-4" />
                        Print Chalan
                      </Button>
                      {/* TODO: Temporarily disabled.
                          Invoice creation will be initiated from Billing > Invoice module.
                          This flow may be re-enabled in the future. */}
                      {/* <Button
                        size="sm"
                        variant="ghost"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={handleStartInvoiceProcess}
                        disabled={
                          selectedOutwardItems === 'all'
                            ? filteredOutwardItems.length === 0
                            : selectedOutwardItems.size === 0
                        }
                      >
                        Start Invoice Process
                        {selectedOutwardItems !== 'all' && selectedOutwardItems.size > 0
                          ? ` (${selectedOutwardItems.size})`
                          : ''}
                      </Button> */}
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Table aria-label="Outward items table" className={dataTableClassName("min-w-full !rounded-none !border-0 !shadow-none")}>
                    <Table.ScrollContainer className="max-h-[calc(100vh-320px)] p-0">
                    <Table.Content
                    selectedKeys={selectedOutwardItems === 'all' ? 'all' : selectedOutwardItems}
                    selectionMode="multiple"
                    onSelectionChange={(keys) => {
                      if (keys === 'all') {
                        setSelectedOutwardItems('all');
                      } else {
                        const stringKeys = new Set(Array.from(keys).map(String));
                        setSelectedOutwardItems(stringKeys);
                      }
                    }}
                  >
                    <Table.Header>
                      <Table.Column id="sn">SN</Table.Column>
                      <Table.Column id="outward_no">OUTWARD NO</Table.Column>
                      <Table.Column id="lab_id">LAB ID</Table.Column>
                      <Table.Column id="name">NAME</Table.Column>
                      <Table.Column id="identification">IDENTIFICATION NO</Table.Column>
                      <Table.Column id="process">PROCESS</Table.Column>
                      <Table.Column id="status">STATUS</Table.Column>
                      <Table.Column id="action">ACTION</Table.Column>
                    </Table.Header>
                    <Table.Body items={filteredOutwardItems} renderEmptyState={() => (
                        loading.outwardItems ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size="md" />
                            <span className="ml-2 text-gray-500">Loading items...</span>
                          </div>
                        ) : 'No outward items found'
                      )}>
                      {(item: OutwardGaugeItem) => {
                        const index = filteredOutwardItems.indexOf(item);
                        const isRemoving = removingGaugeIds.includes(item.gauge_inward_id);
                        return (
                          <Table.Row id={getItemKey(item, index)}>
                            <Table.Cell>{index + 1}</Table.Cell>
                            <Table.Cell>{item.outward_no || '-'}</Table.Cell>
                            <Table.Cell>{item.inward_gauge_lab_id || '-'}</Table.Cell>
                            <Table.Cell>{item.master_gauge_name || '-'}</Table.Cell>
                            <Table.Cell>{item.identification_number || '-'}</Table.Cell>
                            <Table.Cell>{item.process || '-'}</Table.Cell>
                            <Table.Cell>{renderStatusChip(item.status)}</Table.Cell>
                            <Table.Cell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveGaugeFromOutward(item)}
                                disabled={isRemoving}
                              >
                                {isRemoving ? "Removing..." : "Remove from Outward"}
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }}
                    </Table.Body>
                    </Table.Content></Table.ScrollContainer>
                  </Table>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-gray-600">
                      {filteredOutwardItems.length > 0 ? (
                        <>
                          Showing 1 to {filteredOutwardItems.length} of {outwardItems.length} entries
                          {outwardItemsSearch && filteredOutwardItems.length < outwardItems.length && (
                            <span className="ml-2">(filtered from {outwardItems.length} total)</span>
                          )}
                        </>
                      ) : (
                        "No entries to display"
                      )}

                    </div>
                    <div className="items-center gap-2">

                      <Select placeholder="Rows per page">
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover><ListBox>
                          {[10, 25, 50, 100].map((value) => <ListBox.Item key={value} id={String(value)} textValue={String(value)}>{value}</ListBox.Item>)}
                        </ListBox></Select.Popover>
                      </Select>
                    </div>
                  </div>
                </Card.Content>
              </Card>

            </Tabs.Panel>
            <Tabs.Panel id="inwardedItems">
              <Card>
                <Card.Header className="flex justify-between items-center bg-blue-600 text-white">
                  <h3 className="text-md font-semibold">INWARDED ITEMS</h3>
                  <div className="flex gap-2">
                    {/* Only show bulk add when 2+ items are selected (not after single add) */}
                    {selectedInwardedKeys !== "all" && selectedInwardedKeys.size > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={handleBulkAddGauges}
                        disabled={loading.bulkAdding || loading.addingGauge}
                      >
                        Bulk Add ({selectedInwardedKeys.size})
                      </Button>
                    )}
                    {selectedInwardedKeys === "all" && filteredInwardedItems.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={handleBulkAddGauges}
                        disabled={loading.bulkAdding || loading.addingGauge}
                      >
                        Bulk Add All ({filteredInwardedItems.length})
                      </Button>
                    )}

                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                      className="w-full sm:max-w-xs"
                      placeholder="Search..."
                      value={inwardedItemsSearch}
                      onChange={(event) => setInwardedItemsSearch(event.target.value)}
                    />
                  </div>
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Table aria-label="Inwarded items table" className={dataTableClassName("min-w-full !rounded-none !border-0 !shadow-none")}>
                    <Table.ScrollContainer><Table.Content
                    selectedKeys={selectedInwardedKeys === "all" ? "all" : selectedInwardedKeys}
                    selectionMode="multiple"
                    onSelectionChange={(keys) => {
                      if (keys === "all") {
                        setSelectedInwardedKeys("all");
                      } else {
                        const stringKeys = new Set(Array.from(keys).map(String));
                        setSelectedInwardedKeys(stringKeys);
                      }
                    }}
                  >
                    <Table.Header>
                      <Table.Column id="sn">SN</Table.Column><Table.Column id="inward_no">INWARD NO</Table.Column><Table.Column id="lab_id">LAB ID</Table.Column><Table.Column id="name">NAME</Table.Column><Table.Column id="identification">IDENTIFICATION NO</Table.Column><Table.Column id="process">PROCESS</Table.Column><Table.Column id="status">STATUS</Table.Column><Table.Column id="action">ACTION</Table.Column>
                    </Table.Header>
                    <Table.Body items={filteredInwardedItems} renderEmptyState={() => loading.inwardedItems ? <div className="py-8 text-center">Loading inwarded items...</div> : 'No inwarded items found'}>
                      {(item: InwardedGaugeItem) => {
                        const index = filteredInwardedItems.indexOf(item);
                        const itemKey = getItemKey(item, index);
                        const isAdding = addingGaugeId === itemKey;
                        return (
                          <Table.Row id={itemKey} className={isAdding ? "opacity-75" : ""}>
                            <Table.Cell>{index + 1}</Table.Cell>
                            <Table.Cell>{item.inward_no || "-"}</Table.Cell>
                            <Table.Cell>{item.inward_gauge_lab_id || "-"}</Table.Cell>
                            <Table.Cell className="no-wrap">{item.master_gauge_name || "-"}</Table.Cell>
                            <Table.Cell>{item.identification_number || "-"}</Table.Cell>
                            <Table.Cell>{item.process || "-"}</Table.Cell>
                            <Table.Cell>{renderStatusChip(item.status)}</Table.Cell>
                            <Table.Cell>
                              {isAdding ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Loader size="sm" className="border-green-600" />
                                  <span className="text-sm">Adding...</span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleAddGauge(item)}
                                  disabled={loading.bulkAdding}
                                  className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Add to Outward
                                </Button>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        );
                      }}
                    </Table.Body></Table.Content></Table.ScrollContainer>
                  </Table>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {filteredInwardedItems.length > 0 ? (
                      <>
                        Showing 1 to {filteredInwardedItems.length} of {inwardedItems.length} entries
                        {inwardedItemsSearch && filteredInwardedItems.length < inwardedItems.length && (
                          <span className="ml-2">(filtered from {inwardedItems.length} total)</span>
                        )}
                      </>
                    ) : (
                      "No entries to display"
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>

          </Tabs>
        </div>
       
      </TablePageWrapper>
      <DeleteConfirmModal
        isOpen={addStatusConfirmOpen}
        onClose={closeAddStatusConfirm}
        title="Add Pending Calibration Item"
        confirmText="Add Anyway"
        cancelText="Cancel"
        message={
          pendingAddItems.length > 1
            ? `You selected ${pendingAddItems.length} item(s), and some have status "inward_received" instead of "calibration_completed". Are you sure you want to add them to outward?`
            : 'This item has status "inward_received" instead of "calibration_completed". Are you sure you want to add it to outward?'
        }
        onConfirm={handleConfirmPendingStatusAdd}
      />
    </>
  );
});

export default OutwardDetailPage;
