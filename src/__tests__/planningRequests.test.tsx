import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanningRequests } from "../features/notifications/PlanningRequests";
import { notificationApi } from "../features/notifications/api";
import type { PlanningRequest } from "../features/notifications/planningTypes";

const state = vi.hoisted(() => ({ role: "lab_admin" }));
vi.mock("../features/auth", () => ({ useAuth: () => ({ user: { role: state.role, organization_id: "lab" }, canEdit: () => state.role !== "lab_viewer" }) }));
vi.mock("../features/notifications/api", () => ({ notificationApi: {
  getPlanningRequests: vi.fn(), getPlanningRequest: vi.fn(), updatePlanningRequest: vi.fn(),
} }));

const request: PlanningRequest = {
  id: "request", organization_id: "customer", laboratory_id: "lab", organization_name: "Customer One",
  status: "submitted", version: 0, accepted_count: 1, created_at: "2026-10-30", history: [],
  items: [{ snapshot: { gauge_id: "gauge", cycle_key: "cycle", gauge_name: "Caliper", identification_number: "G-1",
    due_date: "2026-11-01", last_calibration_date: "2026-10-01", calibration_frequency: 1, calibration_frequency_unit: "months" } }],
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><PlanningRequests /></QueryClientProvider></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); state.role = "lab_admin"; });

describe("Calibration planning request queue", () => {
  it("lets staff acknowledge a request with the current version", async () => {
    vi.mocked(notificationApi.getPlanningRequests).mockResolvedValue({ requests: [structuredClone(request)], total_count: 1 });
    vi.mocked(notificationApi.updatePlanningRequest).mockResolvedValue({ ...structuredClone(request), status: "acknowledged", version: 1 });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "View request" }));
    expect(screen.getByText(/G-1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save request" }));
    await waitFor(() => expect(notificationApi.updatePlanningRequest).toHaveBeenCalledWith("request", expect.objectContaining({ status: "acknowledged", version: 0 })));
  });

  it("keeps laboratory viewers read-only", async () => {
    state.role = "lab_viewer";
    vi.mocked(notificationApi.getPlanningRequests).mockResolvedValue({ requests: [structuredClone(request)], total_count: 1 });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "View request" }));
    expect(screen.queryByRole("button", { name: "Save request" })).not.toBeInTheDocument();
  });

  it("shows a useful error instead of an empty queue after an API failure", async () => {
    vi.mocked(notificationApi.getPlanningRequests).mockRejectedValue(new Error("Forbidden"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load planning requests");
  });
});
