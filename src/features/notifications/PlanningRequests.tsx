import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Table } from "@heroui/react";
import { toast } from "sonner";
import { notificationApi } from "./api";
import type { PlanningRequest, RequestStatus } from "./planningTypes";
import { useAuth } from "../auth";
import { formatSpecificationForPrint } from "../../utils/specificationPrintFormatter";

const transitions: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["acknowledged", "cancelled"], acknowledged: ["scheduled", "cancelled"],
  scheduled: ["acknowledged", "in_progress", "cancelled"], in_progress: ["completed", "cancelled"],
  cancelled: ["acknowledged"], completed: [],
};
const columns = [{ id: "organization", name: "Customer" }, { id: "status", name: "Status" },
  { id: "gauges", name: "Gauges" }, { id: "planned", name: "Planned date" }, { id: "actions", name: "Actions" }];

export function PlanningRequests() {
  const { user, canEdit: canEditModule } = useAuth();
  const queryClient = useQueryClient();
  const [selection, setSelected] = useState<PlanningRequest | null>(null);
  const selected = selection?.laboratory_id === user?.organization_id ? selection : null;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [plannedFilter, setPlannedFilter] = useState("");
  const [page, setPage] = useState(0);
  const [params] = useSearchParams();
  const requestId = params.get("request");
  const filters = { page, search, status, due_date: dueDate, planned_date: plannedFilter };
  const query = useQuery({ queryKey: ["calibration-requests", user?.organization_id, filters],
    queryFn: () => notificationApi.getPlanningRequests(filters), refetchInterval: 60_000, enabled: Boolean(user?.organization_id) });
  const detail = useQuery({ queryKey: ["calibration-requests", user?.organization_id, requestId],
    queryFn: () => notificationApi.getPlanningRequest(requestId!), enabled: Boolean(requestId && user?.organization_id) });
  const [target, setTarget] = useState<RequestStatus>("acknowledged");
  const [planned, setPlanned] = useState("");
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [reason, setReason] = useState("");
  const canEdit = ["lab_admin", "lab_manager", "lab_engineer", "super_admin", "superadmin", "org_admin", "org_manager"].includes(user?.role ?? "") && canEditModule("inward");
  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select a request");
      return notificationApi.updatePlanningRequest(selected.id, { status: target, version: selected.version,
        planned_date: planned || undefined, note, internal_note: internalNote, reason });
    },
    onSuccess: (request) => { setSelected(request); setTarget(transitions[request.status][0] ?? request.status);
      queryClient.invalidateQueries({ queryKey: ["calibration-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Request updated"); },
    onError: () => { toast.error("Unable to update request. Refresh and check the request status and required fields."); },
  });
  const records = query.data?.requests ?? [];
  const open = (request: PlanningRequest) => { setSelected(request); setTarget(transitions[request.status][0] ?? request.status);
    setPlanned(request.planned_date ?? ""); setNote(request.note ?? ""); setInternalNote(request.internal_note ?? ""); setReason(""); };
  const cell = (request: PlanningRequest, id: string) => {
    if (id === "organization") return request.organization_name;
    if (id === "status") return request.status.replaceAll("_", " ");
    if (id === "gauges") return request.items.length;
    if (id === "planned") return request.planned_date ?? "—";
    return <Button size="sm" variant="secondary" onPress={() => open(request)}>View request</Button>;
  };
  const inputClass = "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm";
  return <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" id="planning-requests">
    <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Calibration Planning Requests</h3>
      <Button size="sm" variant="secondary" onPress={() => { void query.refetch(); }}>Refresh</Button></div>
    <div className="grid gap-3 md:grid-cols-4">
      <label className="text-sm">Customer<input className={inputClass} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search customer" /></label>
      <label className="text-sm">Status<select className={inputClass} value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
        <option value="">All statuses</option>{Object.keys(transitions).map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-sm">Due date<input type="date" className={inputClass} value={dueDate} onChange={e => { setDueDate(e.target.value); setPage(0); }} /></label>
      <label className="text-sm">Planned date<input type="date" className={inputClass} value={plannedFilter} onChange={e => { setPlannedFilter(e.target.value); setPage(0); }} /></label>
    </div>
    {query.isError ? <p role="alert" className="text-sm text-red-600">Unable to load planning requests.</p> : <Table aria-label="Calibration planning requests"><Table.ScrollContainer><Table.Content>
      <Table.Header>{columns.map(c => <Table.Column key={c.id} id={c.id} isRowHeader={c.id === "organization"}>{c.name}</Table.Column>)}</Table.Header>
      <Table.Body items={records} renderEmptyState={() => query.isLoading ? "Loading requests..." : "No planning requests"}>
        {r => <Table.Row id={r.id}>{columns.map(c => <Table.Cell key={c.id}>{cell(r, c.id)}</Table.Cell>)}</Table.Row>}
      </Table.Body>
    </Table.Content></Table.ScrollContainer></Table>}
    <div className="flex items-center justify-end gap-3 text-sm">
      <Button size="sm" isDisabled={page === 0} onPress={() => setPage(page - 1)}>Previous</Button>
      <span>Page {page + 1} · {query.data?.total_count ?? 0} requests</span>
      <Button size="sm" isDisabled={(page + 1) * 25 >= (query.data?.total_count ?? 0)} onPress={() => setPage(page + 1)}>Next</Button>
    </div>
    {detail.data && !selected && <Button size="sm" onPress={() => open(detail.data!)}>Open requested calibration details</Button>}
    {selected && <form className="space-y-3 border-t border-gray-200 pt-4" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
      <div className="flex justify-between"><h4 className="font-semibold">{selected.organization_name} — {selected.status.replaceAll("_", " ")}</h4>
        <Button size="sm" variant="secondary" onPress={() => setSelected(null)}>Close</Button></div>
      <ul className="space-y-2 text-sm">{selected.items.map(({ snapshot: s }) => <li key={s.cycle_key} className="rounded-md border border-gray-200 p-2">
        {s.gauge_name} · {s.identification_number ?? "—"} · Due {s.due_date} · Last calibration {s.last_calibration_date}
        <p className="text-xs text-gray-500">Serial: {s.manf_serial_number || "—"} · {formatSpecificationForPrint(s.specifications, s.unit || "mm", s.gauge_name)} · Certificate: {s.last_certificate_no || "—"}</p>
      </li>)}</ul>
      <details className="text-sm"><summary className="cursor-pointer">Channel delivery status</summary>
        <ul className="mt-2 space-y-1">{selected.deliveries?.map((delivery, index) => <li key={index}>
          {delivery.channel} · {delivery.destination} · {delivery.status} · Attempt {delivery.attempt_number} {delivery.reason}
        </li>)}</ul>
      </details>
      {canEdit && transitions[selected.status].length > 0 && <>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Action<select className={inputClass} value={target} onChange={e => setTarget(e.target.value as RequestStatus)}>
            {transitions[selected.status].map(s => <option key={s} value={s}>{selected.status === "cancelled" ? "Reopen and acknowledge" : s.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-sm">Planned date<input type="date" className={inputClass} required={target === "scheduled"} value={planned} onChange={e => setPlanned(e.target.value)} /></label>
          <label className="text-sm">Customer-visible note<textarea className={inputClass} value={note} onChange={e => setNote(e.target.value)} /></label>
          <label className="text-sm">Internal note<textarea className={inputClass} value={internalNote} onChange={e => setInternalNote(e.target.value)} /></label>
        </div>
        {target === "cancelled" && <label className="block text-sm">Cancellation reason<input required className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></label>}
        <Button type="submit" variant="primary" isDisabled={mutation.isPending}>Save request</Button>
      </>}
      <ul className="text-xs text-gray-500">{selected.history.map((h, i) => <li key={i}>{h.at} · {h.status.replaceAll("_", " ")} {h.note} {h.reason}</li>)}</ul>
    </form>}
  </section>;
}
