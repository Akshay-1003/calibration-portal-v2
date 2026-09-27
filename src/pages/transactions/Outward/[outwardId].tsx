import React, { useEffect, useCallback, useMemo } from "react";
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
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Card,
  CardHeader,
  CardBody,
  SelectItem,
  Select,
  Tabs,
  Tab,
  Chip,
} from "@heroui-v2/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useOutwardStore, type OutwardGaugeItem, type InwardedGaugeItem } from "../../../store/outwardStore";
import { useInvoiceStore } from "../../../store/invoiceStore";
import { Loader } from "../../../components/ui/loader/loader";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";

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
        <Chip color="default" variant="flat" size="sm">
          Unknown
        </Chip>
      );
    }

    const statusLabel = status.replace(/_/g, " ");

    if (status === "calibration_completed") {
      return (
        <Chip color="success" variant="flat" size="sm" className="capitalize">
          {statusLabel}
        </Chip>
      );
    }

    return (
      <Chip color="warning" variant="flat" size="sm" className="capitalize">
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
          <Tabs aria-label="Options">
            <Tab key="outwardItems" title="OUTWARD ITEMS FROM THIS CHALAN" >
              <Card>
                <CardHeader className="flex justify-between items-center bg-blue-600 text-white">
                  <h3 className="text-md font-semibold">OUTWARD ITEMS FROM THIS CHALAN</h3>
                </CardHeader>
                <CardBody>
                  <div className="flex justify-between items-center mb-4">

                    <div className="flex-1 items-center">
                      <Input
                        isClearable
                        className="w-full sm:max-w-xs"
                        placeholder="Search..."
                        startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
                        value={outwardItemsSearch}
                        onValueChange={setOutwardItemsSearch}
                        classNames={{
                          inputWrapper: "border-gray-300 hover:border-gray-400 focus-within:border-blue-500",
                        }}
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
                  <Table
                    aria-label="Outward items table"
                    selectedKeys={selectedOutwardItems === 'all' ? 'all' : (selectedOutwardItems as any)}
                    selectionMode="multiple"
                    classNames={{ wrapper: "max-h-[calc(100vh-320px)] p-0" }}
                    onSelectionChange={(keys) => {
                      if (keys === 'all') {
                        setSelectedOutwardItems('all');
                      } else {
                        const stringKeys = new Set(Array.from(keys).map(String));
                        setSelectedOutwardItems(stringKeys);
                      }
                    }}
                  >
                    <TableHeader>
                      <TableColumn>SN</TableColumn>
                      <TableColumn>OUTWARD NO</TableColumn>
                      <TableColumn>LAB ID</TableColumn>
                      <TableColumn>NAME</TableColumn>
                      <TableColumn>IDENTIFICATION NO</TableColumn>
                      <TableColumn>PROCESS</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>ACTION</TableColumn>
                    </TableHeader>
                    <TableBody
                      emptyContent={
                        loading.outwardItems ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size="md" />
                            <span className="ml-2 text-gray-500">Loading items...</span>
                          </div>
                        ) : (
                          'No outward items found'
                        )
                      }
                      items={filteredOutwardItems}
                      isLoading={loading.outwardItems}
                    >
                      {(item: OutwardGaugeItem) => {
                        const index = filteredOutwardItems.indexOf(item);
                        const isRemoving = removingGaugeIds.includes(item.gauge_inward_id);
                        return (
                          <TableRow key={getItemKey(item, index)}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.outward_no || '-'}</TableCell>
                            <TableCell>{item.inward_gauge_lab_id || '-'}</TableCell>
                            <TableCell>{item.master_gauge_name || '-'}</TableCell>
                            <TableCell>{item.identification_number || '-'}</TableCell>
                            <TableCell>{item.process || '-'}</TableCell>
                            <TableCell>{renderStatusChip(item.status)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveGaugeFromOutward(item)}
                                disabled={isRemoving}
                              >
                                {isRemoving ? "Removing..." : "Remove from Outward"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    </TableBody>
                  </Table>
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

                      <Select label="Rows per page" labelPlacement="outside-left" placeholder="Rows per page" classNames={{
                        trigger: "border-gray-300 hover:border-gray-400 focus-within:border-blue-500 w-full sm:max-w-xs",
                      }}>
                        <SelectItem key="10">10</SelectItem>
                        <SelectItem key="25">25</SelectItem>
                        <SelectItem key="50">50</SelectItem>
                        <SelectItem key="100">100</SelectItem>
                      </Select>
                    </div>
                  </div>
                </CardBody>
              </Card>

            </Tab>
            <Tab key="inwardedItems" title="INWARDED ITEMS">
              <Card>
                <CardHeader className="flex justify-between items-center bg-blue-600 text-white">
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
                        loading={loading.bulkAdding}
                        leftIcon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        }
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
                        loading={loading.bulkAdding}
                        leftIcon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        }
                      >
                        Bulk Add All ({filteredInwardedItems.length})
                      </Button>
                    )}

                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                      isClearable
                      className="w-full sm:max-w-xs"
                      placeholder="Search..."
                      startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
                      value={inwardedItemsSearch}
                      onValueChange={setInwardedItemsSearch}
                      classNames={{
                        inputWrapper: "border-gray-300 hover:border-gray-400 focus-within:border-blue-500",
                      }}
                    />
                  </div>
                  <Table
                    aria-label="Inwarded items table"
                    selectedKeys={selectedInwardedKeys === "all" ? "all" : (selectedInwardedKeys as any)}
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
                    <TableHeader>
                      <TableColumn>SN</TableColumn>
                      <TableColumn>INWARD NO</TableColumn>
                      <TableColumn>LAB ID</TableColumn>
                      <TableColumn>NAME</TableColumn>
                      <TableColumn>IDENTIFICATION NO</TableColumn>
                      <TableColumn>PROCESS</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>ACTION</TableColumn>
                    </TableHeader>
                    <TableBody
                      emptyContent="No inwarded items found"
                      items={filteredInwardedItems}
                      isLoading={loading.inwardedItems}
                    >
                      {(item: InwardedGaugeItem) => {
                        const index = filteredInwardedItems.indexOf(item);
                        const itemKey = getItemKey(item, index);
                        const isAdding = addingGaugeId === itemKey;
                        return (
                          <TableRow key={itemKey} className={isAdding ? "opacity-75" : ""}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.inward_no || "-"}</TableCell>
                            <TableCell>{item.inward_gauge_lab_id || "-"}</TableCell>
                            <TableCell className="no-wrap">{item.master_gauge_name || "-"}</TableCell>
                            <TableCell>{item.identification_number || "-"}</TableCell>
                            <TableCell>{item.process || "-"}</TableCell>
                            <TableCell>{renderStatusChip(item.status)}</TableCell>
                            <TableCell>
                              {isAdding ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Loader size="sm" className="border-green-600" />
                                  <span className="text-sm">Adding...</span>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleAddGauge(item)}
                                  disabled={loading.bulkAdding}
                                  className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Add to Outward
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    </TableBody>
                  </Table>
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
                </CardBody>
              </Card>
            </Tab>

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
