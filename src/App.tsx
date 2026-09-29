import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import ScrollToTop from "./components/ScrollToTop";
import { PageLoader } from "./components/ui/AppLoader";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { NavigationProvider } from "./context/NavigationContext";
import NavigationStateSync from "./components/navigation/NavigationStateSync";
import RouteTransitionLoader from "./components/ui/RouteTransitionLoader";
import { AuthProvider } from "./features/auth/components/AuthProvider";
import { AuthGate } from "./features/auth/components/AuthGate";
import { ModuleAccessGuard } from "./features/auth/components/ModuleAccessGuard";
import ProtectedLayout from "./features/auth/components/ProtectedLayout";
import { SettingsAdminRoute } from "./features/auth/components/SettingsAdminRoute";
import {
  billingAccessRoles,
  settingsAdministrationRoles,
  settingsUserManagementRoles,
} from "./config/access-control";
import type { PermissionAction, PermissionModule } from "./features/auth/types/auth.types";

// Feature-based lazy imports
const SignInPage = lazy(() => import("./features/auth/SignIn"));
const SignUpPage = lazy(() => import("./features/auth/SignUp"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./features/auth/ResetPassword"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const PartyMasterPage = lazy(() => import("./pages/masters/PartyMaster/page"));
const PartyMasterForm = lazy(() => import("./pages/masters/PartyMaster/create"));
const PartyMasterEditForm = lazy(() => import("./pages/masters/PartyMaster/edit"));
const RateCardPage = lazy(() => import("./pages/masters/PartyMaster/rate-card"));
const GaugesMasterPage = lazy(() => import("./pages/masters/GaugesMaster/page"));
const GaugesMasterForm = lazy(() => import("./pages/masters/GaugesMaster/create"));
const EquipmentMasterPage = lazy(() => import("./pages/masters/EquipmentMaster/page"));
const EquipmentMasterForm = lazy(() => import("./pages/masters/EquipmentMaster/create"));
const EquipmentMasterEditForm = lazy(() => import("./pages/masters/EquipmentMaster/edit"));
const EquipmentHistoryPage = lazy(() => import("./pages/masters/EquipmentHistory/page"));
const EquipmentHistoryForm = lazy(() => import("./pages/masters/EquipmentHistory/create"));
const EquipmentHistoryEditForm = lazy(() => import("./pages/masters/EquipmentHistory/edit"));
const ThreadRingPlugPage = lazy(() => import("./pages/masters/ThreadRingPlug/page"));
const ThreadRingPlugForm = lazy(() => import("./pages/masters/ThreadRingPlug/create"));
const ThreadRingPlugEditForm = lazy(() => import("./pages/masters/ThreadRingPlug/edit"));
const TaperThreadReadingsPage = lazy(() => import("./pages/masters/TaperThreadReadings/page"));
const TaperThreadReadingsForm = lazy(() => import("./pages/masters/TaperThreadReadings/create"));
const TaperThreadReadingsEditForm = lazy(() => import("./pages/masters/TaperThreadReadings/edit"));
const SurfacePlateMasterPage = lazy(() => import("./pages/masters/SurfacePlateMaster/page"));
const SurfacePlateMasterCreatePage = lazy(() => import("./pages/masters/SurfacePlateMaster/create"));
const SurfacePlateMasterEditPage = lazy(() => import("./pages/masters/SurfacePlateMaster/edit"));
const ReadingMasterPage = lazy(() => import("./pages/masters/ReadingMaster/page"));
const ReadingMasterCreatePage = lazy(() => import("./pages/masters/ReadingMaster/create"));
const ReadingMasterEditPage = lazy(() => import("./pages/masters/ReadingMaster/edit"));
const DialTableMasterPage = lazy(() => import("./pages/masters/DialTableMaster/page"));
const DialTableMasterForm = lazy(() => import("./pages/masters/DialTableMaster/create"));
const FormatNumbersPage = lazy(() => import("./pages/masters/FormatNumbers/page"));
const ScopeMasterEditPage = lazy(() => import("./pages/masters/ScopeMaster/edit"));
const ScopeMasterPage = lazy(() => import("./pages/masters/ScopeMaster/page"));
const ScopeMasterForm = lazy(() => import("./pages/masters/ScopeMaster/create"));
const InwardPage = lazy(() => import("./pages/transactions/Inward/page"));
const InwardForm = lazy(() => import("./pages/transactions/Inward/create"));
const InwardEditForm = lazy(() => import("./pages/transactions/Inward/edit"));
const RegisterGaugePage = lazy(() => import("./pages/transactions/Inward/register-gauge"));
const OutwardPage = lazy(() => import("./pages/transactions/Outward/page"));
const OutwardForm = lazy(() => import("./pages/transactions/Outward/create"));
const OutwardDetailPage = lazy(() => import("./pages/transactions/Outward/[outwardId]"));
const CreateOutwardInvoicePage = lazy(() => import("./pages/transactions/Outward/[outwardId]/create-outward-invoice"));
const EditOutwardInvoicePage = lazy(() => import("./pages/transactions/Outward/[outwardId]/edit-outward-invoice"));
const CalibrationCertificatePage = lazy(() => import("./pages/transactions/calibration-certificate/page"));
const CalibrationInwardPage = lazy(() => import("./pages/transactions/calibration/inwards/page"));
const CalibrationPage = lazy(() => import("./pages/transactions/calibration/page"));
const NablCalibrationProcessPage = lazy(() => import("./pages/transactions/calibration-certificate/nabl-process/[gaugeId]"));
const InvoicePage = lazy(() => import("./pages/billing/invoice/page"));
const CreateBillingInvoicePage = lazy(() => import("./pages/billing/invoice/create"));
const EditBillingInvoicePage = lazy(() => import("./pages/billing/invoice/edit"));
const QuotationPage = lazy(() => import("./pages/billing/quotation/page"));
const CreateQuotationPage = lazy(() => import("./pages/billing/quotation/create"));
const SettingsPage = lazy(() => import("./pages/settings/index"));
const HelpPage = lazy(() => import("./pages/help/index"));
// Auth pages are lazy-loaded above
const StickerBrowserPrintPage = lazy(() => import("./pages/print/stickers"));
const RepairPage = lazy(() => import("./pages/maintenance/page"));
const RepairCreatePage = lazy(() => import("./pages/maintenance/create"));
const RepairEditPage = lazy(() => import("./pages/maintenance/edit"));
const RepairMasterPage = lazy(() => import("./pages/maintenance/repair-master/page"));
const RepairMasterCreatePage = lazy(() => import("./pages/maintenance/repair-master/create"));
const RepairMasterEditPage = lazy(() => import("./pages/maintenance/repair-master/edit"));
export default function App() {
  const withModuleAccess = (
    module: PermissionModule,
    action: PermissionAction,
    element: ReactNode,
    allowedRoles?: readonly string[],
  ) => (
    <ModuleAccessGuard module={module} action={action} allowedRoles={allowedRoles}>
      {element}
    </ModuleAccessGuard>
  );

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <NavigationProvider>
            <ScrollToTop />
            <NavigationStateSync />
            {/* Global Route Transition Loader */}
            <RouteTransitionLoader />
            <Toaster 
              position="bottom-left"
              richColors
              closeButton
              duration={4000}
            />
            <Routes>
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Public routes */}
              <Route path="/login" element={
                <Suspense fallback={<PageLoader />}>
                  <SignInPage />
                </Suspense>
              } />
              <Route path="/signin" element={
                <Suspense fallback={<PageLoader />}>
                  <SignInPage />
                </Suspense>
              } />
              <Route path="/signup" element={
                <Suspense fallback={<PageLoader />}>
                  <SignUpPage />
                </Suspense>
              } />
              <Route path="/forgot-password" element={
                <Suspense fallback={<PageLoader />}>
                  <ForgotPasswordPage />
                </Suspense>
              } />
              <Route path="/reset-password" element={
                <Suspense fallback={<PageLoader />}>
                  <ResetPasswordPage />
                </Suspense>
              } />
              
              {/* Print routes - accessible without layout */}
              <Route path="/print/stickers" element={
                <Suspense fallback={<PageLoader />}>
                  <StickerBrowserPrintPage />
                </Suspense>
              } />
              
              {/* Protected routes */}
              <Route
                element={
                  <AuthGate>
                    <ProtectedLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Outlet />
                      </Suspense>
                    </ProtectedLayout>
                  </AuthGate>
                }
              >
                {/* Dashboard */}
                <Route path="/dashboard" element={
                  <Suspense fallback={<PageLoader />}>
                    <Home />
                  </Suspense>
                } />
              
              {/* Inward Feature */}
              <Route path="/transactions/inward" element={
                withModuleAccess("inward", "view",
                  <Suspense fallback={<PageLoader />}>
                    <InwardPage />
                  </Suspense>
                )
              } />
              <Route path="/transactions/inward/create" element={
                withModuleAccess("inward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <InwardForm />
                  </Suspense>
                )
              } />
              <Route path="/transactions/inward/edit/:inwardId" element={
                withModuleAccess("inward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <InwardEditForm />
                  </Suspense>
                )
              } />
              <Route path="/transactions/inward/:inwardId/register-gauge/:clientId/:inward_no/:clientName/:inwardDate" element={
                withModuleAccess("inward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <RegisterGaugePage />
                  </Suspense>
                )
              } />
              {/* Outward Feature */}
              <Route path="/transactions/outward" element={
                withModuleAccess("outward", "view",
                  <Suspense fallback={<PageLoader />}>
                    <OutwardPage />
                  </Suspense>
                )
              } />
              <Route path="/transactions/outward/create" element={
                withModuleAccess("outward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <OutwardForm />
                  </Suspense>
                )
              } />
              <Route path="/transactions/outward/:outwardId" element={
                withModuleAccess("outward", "view",
                  <Suspense fallback={<PageLoader />}>
                    <OutwardDetailPage />
                  </Suspense>
                )
              } />
              <Route path="/transactions/outward/create-outward-invoice/:invoiceId/:outwardId/:outwardNo" element={
                withModuleAccess("outward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <CreateOutwardInvoicePage />
                  </Suspense>
                )
              } />
              <Route path="/transactions/outward/edit-outward-invoice/:invoiceId" element={
                withModuleAccess("outward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <EditOutwardInvoicePage />
                  </Suspense>
                )
              } />
              
              {/* Calibration Certificate Feature */}
              <Route path="/transactions/calibration-certificate" element={
                withModuleAccess("inward", "view",
                  <Suspense fallback={<PageLoader />}>
                    <CalibrationCertificatePage />
                  </Suspense>
                )
              } />
              
              {/* Calibration Feature */}
              <Route path="/transactions/calibration/inwards" element={
                withModuleAccess("inward", "view",
                  <Suspense fallback={<PageLoader />}>
                    <CalibrationInwardPage />
                  </Suspense>
                )
              } />
              <Route path="/transactions/calibration/:inwardId" element={
                withModuleAccess("inward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <CalibrationPage />
                  </Suspense>
                )
              } />
              <Route path="/transactions/calibration-certificate/nabl-process/:inwardId/:gaugeId" element={
                withModuleAccess("inward", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <NablCalibrationProcessPage />
                  </Suspense>
                )
              } />
              
              {/* Billing Feature */}
              <Route path="/billing/invoice" element={
                withModuleAccess("invoice", "view",
                  <Suspense fallback={<PageLoader />}>
                    <InvoicePage />
                  </Suspense>, billingAccessRoles
                )
              } />
              <Route path="/billing/invoice/create" element={
                withModuleAccess("invoice", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <CreateBillingInvoicePage />
                  </Suspense>, billingAccessRoles
                )
              } />
              <Route path="/billing/invoice/:invoiceId/edit" element={
                withModuleAccess("invoice", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <EditBillingInvoicePage />
                  </Suspense>, billingAccessRoles
                )
              } />
              <Route path="/billing/quotation" element={
                withModuleAccess("invoice", "view",
                  <Suspense fallback={<PageLoader />}>
                    <QuotationPage />
                  </Suspense>, billingAccessRoles
                )
              } />
              <Route path="/billing/quotation/create" element={
                withModuleAccess("invoice", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <CreateQuotationPage />
                  </Suspense>, billingAccessRoles
                )
              } />
              <Route path="/billing/quotation/:quotationId/edit" element={
                withModuleAccess("invoice", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <CreateQuotationPage />
                  </Suspense>, billingAccessRoles
                )
              } />


              {/* Masters Feature */}
              <Route path="/masters/party-master" element={
                withModuleAccess("other_masters", "view",
                  <Suspense fallback={<PageLoader />}>
                    <PartyMasterPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/party-master/create" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <PartyMasterForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/party-master/edit/:id" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <PartyMasterEditForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/party-master/:id/rate-card" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <RateCardPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/gauges-master" element={
                withModuleAccess("gauge_master", "view",
                  <Suspense fallback={<PageLoader />}>
                    <GaugesMasterPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/gauges-master/create" element={
                withModuleAccess("gauge_master", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <GaugesMasterForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/gauges-master/edit/:id" element={
                withModuleAccess("gauge_master", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <GaugesMasterForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/equipment-master" element={
                withModuleAccess("equipment", "view",
                  <Suspense fallback={<PageLoader />}>
                    <EquipmentMasterPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/equipment-master/create" element={
                withModuleAccess("equipment", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <EquipmentMasterForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/equipment-master/edit/:id" element={
                withModuleAccess("equipment", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <EquipmentMasterEditForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/equipment-history" element={
                withModuleAccess("equipment", "view",
                  <Suspense fallback={<PageLoader />}>
                    <EquipmentHistoryPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/equipment-history/create" element={
                withModuleAccess("equipment", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <EquipmentHistoryForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/equipment-history/edit/:id" element={
                withModuleAccess("equipment", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <EquipmentHistoryEditForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/thread-ring-plug" element={
                withModuleAccess("other_masters", "view",
                  <Suspense fallback={<PageLoader />}>
                    <ThreadRingPlugPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/thread-ring-plug/create" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <ThreadRingPlugForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/thread-ring-plug/edit/:id" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <ThreadRingPlugEditForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/taper-thread-readings" element={
                withModuleAccess("other_masters", "view",
                  <Suspense fallback={<PageLoader />}>
                    <TaperThreadReadingsPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/taper-thread-readings/create" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <TaperThreadReadingsForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/taper-thread-readings/edit/:id" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <TaperThreadReadingsEditForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/surface-plate-master" element={
                withModuleAccess("other_masters", "view",
                  <Suspense fallback={<PageLoader />}>
                    <SurfacePlateMasterPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/surface-plate-master/create" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <SurfacePlateMasterCreatePage />
                  </Suspense>
                )
              } />
              <Route path="/masters/surface-plate-master/edit/:id" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <SurfacePlateMasterEditPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/reading-master" element={
                withModuleAccess("other_masters", "view",
                  <Suspense fallback={<PageLoader />}>
                    <ReadingMasterPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/reading-master/create" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <ReadingMasterCreatePage />
                  </Suspense>
                )
              } />
              <Route path="/masters/reading-master/edit/:id" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <ReadingMasterEditPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/dial-table-master" element={
                withModuleAccess("other_masters", "view",
                  <Suspense fallback={<PageLoader />}>
                    <DialTableMasterPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/format-numbers" element={
                withModuleAccess("format_number", "view",
                  <Suspense fallback={<PageLoader />}>
                    <FormatNumbersPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/scope-master/create" element={
                withModuleAccess("scope", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <ScopeMasterForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/scope-master/edit/:id" element={
                withModuleAccess("scope", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <ScopeMasterEditPage />
                  </Suspense>
                )
              } />
              <Route path="/masters/scope-master" element={
                withModuleAccess("scope", "view",
                  <Suspense fallback={<PageLoader />}>
                    <ScopeMasterPage />
                  </Suspense>
                )
              } />

              {/* Dial Table Master Feature */}
              <Route path="/masters/dial-table-master/create" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <DialTableMasterForm />
                  </Suspense>
                )
              } />
              <Route path="/masters/dial-table-master/edit/:id" element={
                withModuleAccess("other_masters", "edit",
                  <Suspense fallback={<PageLoader />}>
                    <DialTableMasterForm />
                  </Suspense>
                )
              } />

              {/* Settings Feature */}
              <Route path="/settings" element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              } />
              <Route path="/settings/users" element={
                <SettingsAdminRoute allowedRoles={settingsUserManagementRoles}>
                  <Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </Suspense>
                </SettingsAdminRoute>
              } />
              <Route path="/settings/accounts" element={
                <SettingsAdminRoute allowedRoles={settingsAdministrationRoles}>
                  <Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </Suspense>
                </SettingsAdminRoute>
              } />
              <Route path="/settings/laboratories" element={
                <SettingsAdminRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </Suspense>
                </SettingsAdminRoute>
              } />
              <Route path="/settings/roles-permissions" element={
                <SettingsAdminRoute allowedRoles={settingsAdministrationRoles}>
                  <Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </Suspense>
                </SettingsAdminRoute>
              } />
              <Route path="/settings/:tab" element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              } />

              {/* Help Feature */}
              <Route path="/help" element={
                <Suspense fallback={<PageLoader />}>
                  <HelpPage />
                </Suspense>
              } />
              
              {/* Maintenance Feature */}
              <Route path="/maintenance" element={
                <Suspense fallback={<PageLoader />}>
                  <RepairPage />
                </Suspense>
              } />
              <Route path="/maintenance/create" element={
                <Suspense fallback={<PageLoader />}>
                  <RepairCreatePage />
                </Suspense>
              } />
              <Route path="/maintenance/edit/:id" element={
                <Suspense fallback={<PageLoader />}>
                  <RepairEditPage />
                </Suspense>
              } />

              {/* Repair Master Feature */}
              <Route path="/maintenance/repair-master" element={
                <Suspense fallback={<PageLoader />}>
                  <RepairMasterPage />
                </Suspense>
              } />
              <Route path="/maintenance/repair-master/create" element={
                <Suspense fallback={<PageLoader />}>
                  <RepairMasterCreatePage />
                </Suspense>
              } />
              <Route path="/maintenance/repair-master/edit/:id" element={
                <Suspense fallback={<PageLoader />}>
                  <RepairMasterEditPage />
                </Suspense>
              } />
            </Route>
          </Routes>
          </NavigationProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
