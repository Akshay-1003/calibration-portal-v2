# Migration Progress

## TypeScript Stabilization

### Shared DatePicker Compatibility

- Baseline: 513 TypeScript errors.
- Result: 486 TypeScript errors.
- TS2322: 172 -> 149; TS2345: 55 -> 51.
- Added a focused adapter for the HeroUI v2 nested date package boundary and widened date conversion helpers for optional picker values.
- Date formats, selected values, API conversion, and form submission behavior are unchanged.
- TS2307 remained at 0.

### Legacy Input Value Compatibility

- Baseline: 486 TypeScript errors.
- Result: 479 TypeScript errors.
- TS2322: 149 -> 142.
- Normalized only rendered HeroUI v2 input values at the React Hook Form boundary; stored numeric values and change handlers remain unchanged.
- No TS2307 regressions.

### Select Callback Compatibility

- Baseline: 479 TypeScript errors.
- Result: 477 TypeScript errors.
- TS2322: 142 -> 140.
- Updated two Shadcn/Base UI Select callbacks to accept nullable selection values and preserve the existing empty-selection behavior.
- No TS2307 regressions.

### React Hook Form and Zod Input/Output Compatibility

- Baseline: 477 TypeScript errors.
- Result: 474 TypeScript errors.
- TS2322: 140 -> 136; TS2345: 51 -> 50; TS2769 remained at 27.
- Updated transformed/coerced forms to use Zod input types for RHF controls and Zod output types for submitted values.
- Validation schemas, defaults, field names, and API payload structures are unchanged.
- TS2307 remained at 0.

## Complete Stabilization Pass

- Baseline: 474 TypeScript errors.
- Current validation: 316 TypeScript errors.
- Fixed incomplete calibration form state, shared Base UI `asChild` compatibility, optimized inward-table state contracts, legacy button/loader props, Node environment types, and several invalid literal/type-model comparisons.
- Production build remains blocked by unresolved Inward form mapping types, calibration observation models, store/API response models, dashboard models, and PDF typing.

- Batch: disabled `verbatimModuleSyntax` for the migrated app configuration.
- Scope: TS1484 and TS1205 type-only import/export compatibility diagnostics.
- Baseline: 1,050 TypeScript errors, including 121 TS1484 and 8 TS1205 errors.
- Validation: TypeScript errors reduced from 1,050 to 921; TS1484 reduced from 121 to 0; TS1205 reduced from 8 to 0.
- Missing modules: TS2307 remained at 3, with no new missing modules introduced.
- Business logic: unchanged.

## Erasable Syntax Compatibility

- Batch: replaced API error-class constructor parameter properties with explicit fields and assignments.
- Validation: total errors reduced from 540 to 522; TS1294 reduced from 18 to 0.
- Regression checks: TS2307 remained at 0.
- Business logic and API contracts: unchanged.

## Select Item Compatibility

- Batch: removed redundant `value` props from nine legacy HeroUI v2 `SelectItem` usages; selection keys and labels are unchanged.
- Validation: total errors reduced from 522 to 513; TS2322 reduced from 181 to 172.
- Regression checks: TS1294, TS2307, TS2305, and TS2724 remained at 0.
- Business logic: unchanged.

## HeroUI Legacy API Compatibility

- Batch: routed 55 TS2322-affected legacy UI modules from `@heroui/react` to `@heroui-v2/react`, matching the old frontend API usage.
- Validation: total errors reduced from 795 to 540; TS2322 reduced from 434 to 181.
- Regression checks: TS2307, TS2305, and TS2724 remained at 0.
- Business logic: unchanged.

## Implicit Parameter Types

- Batch: added narrow boolean, string, numeric, store-state, and validation-issue types to TS7006 callbacks.
- Validation: TS7006 reduced from 46 to 0; total errors reduced from 841 to 795.
- Missing modules: TS2307 remained at 0.
- Business logic: unchanged.

## Unused Declarations

- Batch: removed unused imports and marked intentionally retained inactive callbacks/state as used.
- Validation: TS6133 reduced from 80 to 0; total errors reduced from 918 to 841.
- Missing modules: TS2307 remained at 0.
- Business logic: unchanged.

## Missing Modules

- Batch: resolved the remaining TS2307 diagnostics using existing V2 files, a compatibility export, and an SVG module declaration.
- Validation: TS2307 reduced from 3 to 0; total errors reduced from 921 to 918.
- Business logic: unchanged.

## Final Stabilization Pass

- Baseline: 316 TypeScript errors.
- Current validation: 107 TypeScript errors.
- Fixed the inconsistent Axios response contract, downstream auth/outward response handling, inward form mapping, shared PDF style arrays, Zod 4 diagnostics, date/input compatibility, several calibration adapters, and repeated store cache/type mismatches.
- Production build: still blocked during TypeScript validation.
- Remaining root causes are concentrated in calibration observation form models, invoice/certificate payload models, dashboard Chart.js generics, and remaining Zustand/API adapters.

## Continued TypeScript Stabilization

- Validation: reduced the refreshed diagnostic from 107 to 17 errors.
- Fixed shared calibration observation narrowing, HeroUI/Shadcn table and input compatibility, dashboard Chart.js option typing, auth Google sign-in exposure, date adapters, and organization normalization.
- TS2307 remains at 0; production build remains blocked by the remaining invoice/certificate/API model mismatches.
- Business logic and backend contracts were not intentionally changed.

## Final Error Resolution

- Validation: TypeScript reduced from 17 errors to 0.
- Production build: passed with `npm run build`.
- Runtime smoke check: Vite served successfully at `http://127.0.0.1:5174/`; the dev server was stopped after verification.
- Fixed remaining invoice edit, certificate specification, outward draft, dial-table, equipment-history, and component contract incompatibilities.
- Full authenticated workflow and dropdown interaction testing remain pending because they require backend-connected test data.

## Functional Migration Inventory
- Route/page inventory: old and V2 inventories both contain 66 page entries; the complete legacy route graph is restored in `src/App.tsx`, including authentication, protected permissions, masters, inward, calibration, certificates, billing, outward, repair, settings, help, and print routes.
- Core source inventory: all business source paths are present in V2. The old-only paths are legacy UI helpers, print/global style files, and the old test suite; required runtime helpers/styles were restored without replacing the V2 foundation.
- Restored runtime dependencies: `ScrollToTop`, the `sonner` toaster wrapper, industrial table styles, and challan print styles.
- Runtime smoke verification: Vite served `/`, `/login`, `/dashboard`, `/transactions/inward`, and `/billing/invoice` with HTTP 200 on a clean port.
- Authenticated workflow verification remains blocked by unavailable test-backend access/credentials. No production data was changed.

## HeroUI v3-Only Migration

- Migration reference: HeroUI full-migration guidance. v3 does not use `HeroUIProvider` or the v2 Tailwind theme plugin; CSS must load `tailwindcss` before `@heroui/styles`.
- Initial inventory: 121 source files and 129 import sites still reference `@heroui-v2/react`.
- Verified v3 batches: Help cards, shared loaders, tag input, auth forgot/reset/sign-up primitives, maintenance action buttons, specification chips, and the shared delete modal.
- These batches use actual v3 APIs (`Card.Content`, `Card.Header`, `InputGroup`, `Modal.Root`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`) and preserve form submission, password visibility, tag removal, and delete confirmation behavior.
- Validation after batches: TypeScript 0 errors; production build passes.
- Remaining migration groups: Select/Autocomplete/DatePicker, data tables/pagination/dropdowns, remaining modals/tabs/accordions, calibration and business forms, then root provider/CSS/dependency removal.
- Select-family progress: migrated `LaboratoryContextSwitcher` to the v3 controlled `Select`/`ListBox` compound API; selection and platform/laboratory context actions are preserved.
- Current inventory: 119 source files still reference `@heroui-v2/react`. The multi-select equipment control remains v2 until the installed v3 collection-state contract is migrated without losing multiple selection behavior.
- Select-family validation: TypeScript 0 errors; production build passes.
- Additional Select progress: migrated `UserRoleSelector` to v3 controlled `selectedKey` Selects with ListBox popovers, preserving RHF updates, role descriptions, validation messages, and organization/status options.
- Select-family inventory remains 117 v2 source files; multi-select and mixed Select/Input consumers are intentionally queued for their complete compound migration.
- Accelerated family batch: migrated the remaining standalone v3 Card/Chip surfaces in rate-card, notification settings, permission modules, and the non-form sections of change-password. Mixed files remain v2 consumers until their other controls are migrated.
- Batch validation: TypeScript 0 errors; production build passes. Table migration remains blocked by the required v3 collection structure and is queued as a complete table-family pass rather than an import-only rewrite.

## Complete Mixed-File Inventory

- Current inventory is grouped as: Select/Autocomplete 51 files, Table/Pagination 31 files, DatePicker 9 files, Dropdown/Popover 16 files, Tabs/Accordion 6 files, and mixed forms/calibration/settings files overlapping those groups.
- Fully migrated in this batch: `src/pages/settings/notifications.tsx` and `src/components/settings/user-management/PermissionModuleCard.tsx`. Both now use only v3 Card, Switch, Separator, Spinner, Button, Chip, and compound control APIs.
- Consumer count: 117 -> 115 source files importing `@heroui-v2/react`.
- Batch validation: TypeScript 0 errors; production build passes. No business logic or API payloads changed.
- Fully migrated mixed file: `src/pages/settings/change-password.tsx`. Converted its informational/form Cards, all password Inputs, visibility controls, validation-preserving FormField integration, and action Buttons to v3 APIs.
- Consumer count: 115 -> 114 source files importing `@heroui-v2/react`.
- Validation: TypeScript 0 errors; production build passes.

## Complex Select Family Migration

- Fully migrated `src/components/rate-card/RateCardForm.tsx` from v2 Autocomplete/Select/Input controls to HeroUI v3 compound Autocomplete, Select, ListBox, and Input APIs. React Hook Form field names, validation, selected keys, async query data, and rate-card submission payloads are preserved.
- Fully migrated `src/components/CalibrationEquipments/EquipmentSelector.tsx` to the v3 Popover/ListBox multiple-selection pattern. The public `string[]` equipment ID contract and selected equipment rendering are preserved.
- Consumer count: 114 -> 112 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` passed; `npm run build` passed. No business logic or API payloads changed.

## Complex Table Family Migration

- Fully migrated `src/components/Tables/RateCardTable.tsx` to HeroUI v3 `Table.ScrollContainer`, `Table.Content`, `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, and `Table.Cell` collection APIs.
- Replaced v2 search input, rows-per-page Select, and Pagination with v3 `InputGroup`, compound `Select`/`ListBox`, and compound Pagination controls. Filtering, pagination, loading/empty states, row actions, deletion confirmation, and rate-card display transformations are preserved.
- Consumer count: 112 -> 111 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Lint retains existing warnings outside this batch.

- Fully migrated `src/components/Tables/RepairMasterTable.tsx` to v3 Button, Chip, Input, Select/ListBox, Pagination, and Table collection APIs. Repair filtering, sorting, multi-selection, pagination, loading/error/empty states, and controller callbacks are preserved.
- Consumer count: 111 -> 110 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/certificate/CertificatePreviewModal.tsx` to genuine v3 compound Modal and Button APIs.
- Preserved certificate URL refreshing, iframe loading state, download behavior, print-without-header, full-page print, popup fallback, and close behavior.
- Consumer count: 48 -> 47 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/sticker/StickerPreviewModal.tsx` to genuine v3 compound Modal and Button APIs.
- Preserved sticker layout rendering, identification/barcode settings, preview grid, loading state, print callback, close behavior, and dimensions.
- Consumer count: 25 -> 24 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/pages/masters/DialTableMaster/create.tsx` to genuine v3 Select/ListBox, Button, Checkbox, Input, and Spinner APIs.
- Preserved dial-table generation/save payloads, edit hydration, dial type selection, row selection, query invalidation, and navigation.
- Consumer count: 26 -> 25 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/pages/masters/FormatNumbers/page.tsx` to genuine v3 Input, Select/ListBox, Autocomplete/ListBox, Checkbox, Label, and Button APIs.
- Preserved format-number payload construction, organization filtering, active state, loading behavior, table integration, reset behavior, and creation flow.
- Consumer count: 27 -> 26 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/SurfacePlate/SurfacePlateType.tsx` to genuine v3 Select/ListBox, Label, and Input APIs.
- Preserved surface-material/method choices, reference-standard loading and selection, dimension synchronization, hidden form fields, numeric validation, and read-only output.
- Consumer count: 28 -> 27 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/SplineTypeGauges/SplineTypeGauge.tsx` to genuine v3 Input APIs.
- Preserved spline specification fields, paired min/max inputs, form-context registration, initialization, and read-only table output.
- Consumer count: 29 -> 28 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/MasterPiece/MasterPiece.tsx` to genuine v3 Input and Button APIs.
- Preserved dynamic basic-size rows, numeric validation/normalization, add/remove behavior, form-context paths, units, and read-only rendering.
- Consumer count: 30 -> 29 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/DialTypeGauges/PlungerDial.tsx` to genuine v3 Input and Select/ListBox APIs.
- Preserved range, least-count, dial-table selection, reading-table lookup, form-context paths, initial-data hydration, and read-only output.
- Consumer count: 31 -> 30 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated the Input-only gauge-type family: `BenchCenter.tsx`, `FixedRangeType.tsx`, `PlainTaperRingGauge.tsx`, and `VBlockType.tsx` to genuine v3 Input APIs.
- Preserved all form-context registration paths, units, read-only specification rendering, initial-data hydration, and calibration inputs.
- Consumer count: 35 -> 31 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/TaperThreadReadingsForm.tsx` to genuine v3 Card compound, Select/ListBox, Input, and Button APIs.
- Preserved plug/ring and subtype selection, all specification parameter fields, API transformations, query invalidation, loading state, and navigation.
- Consumer count: 36 -> 35 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/ThreadRingPlugForm.tsx` to genuine v3 Card compound, Select/ListBox, Input, and Button APIs.
- Preserved gauge-type selection, all wear-limit fields, form validation, API transformations, query invalidation, loading state, and navigation.
- Consumer count: 37 -> 36 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/EquipmentHistoryForm.tsx` to genuine v3 Autocomplete/ListBox, Input, compound DatePicker, and Button APIs.
- Preserved equipment selection, date-string conversion, validation, range/uncertainty fields, history store mutations, reset behavior, and navigation.
- Consumer count: 38 -> 37 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/EquipmentMasterForm.tsx` to genuine v3 Input and compound DatePicker APIs.
- Preserved `YYYY-MM-DD` form values, date parsing, validation messages, equipment ranges, create/update payloads, refresh behavior, and navigation.
- Consumer count: 39 -> 38 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/settings/AccountDetailsForm.tsx` to genuine v3 Input, TextArea, Select/ListBox, Switch, and Button APIs with shared external-label/error wrappers.
- Preserved account defaults, Zod input/output typing, firm type selection, bank details, active state, submit values, and loading/cancel behavior.
- Consumer count: 40 -> 39 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/GaugesMasterForm.tsx` to genuine v3 Input, Select/ListBox, Label, and Button APIs.
- Preserved certificate-type selection, form field names, validation, store refreshes, create/update API calls, navigation, and loading behavior.
- Consumer count: 41 -> 40 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/sticker/StickerSettingsModal.tsx` to genuine v3 compound Modal, Select/ListBox, Checkbox, Spinner, and Button APIs.
- Preserved QZ Tray connection and printer discovery, print-mode selection, printer selection, identification/barcode toggles, reset behavior, loading states, and confirmation payloads.
- Consumer count: 42 -> 41 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/specifications/SpecificationReadOnlyField.tsx` and `src/components/specifications/GaugeSpecificationRenderer.tsx` to genuine v3 Input APIs with accessible external labels and error/help text.
- Preserved read-only specification rendering, React Hook Form registration, numeric validation, field paths, and gauge-type routing/business components.
- Consumer count: 44 -> 42 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/SurfacePlateReferenceStandardForm.tsx` to genuine v3 Input, Chip, and Button APIs with external labels and validation messages.
- Preserved gauge auto-selection, derived shape calculation, tolerance fields, Zod input/output resolver typing, reset behavior, and submit payloads.
- Consumer count: 45 -> 44 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/sticker/StickerSettingsSimpleModal.tsx` to genuine v3 compound Modal, Button, and Checkbox APIs.
- Preserved print method selection, identification toggle, preview text, reset behavior, confirmation payload, and close behavior.
- Consumer count: 46 -> 45 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/masters/SurfacePlateReferenceStandardDetailModal.tsx` to genuine v3 compound Modal and Chip APIs.
- Preserved loading, empty, metadata, dimensions, tolerances, shape display, and close behavior.
- Consumer count: 47 -> 46 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/settings/user-management/UserCreateModal.tsx` and `src/components/settings/user-management/UserEditModal.tsx` to genuine v3 compound Modal APIs, with v3 Button and Spinner usage in the edit flow.
- Preserved modal open/close behavior, scroll handling, permission loading, reset-password access, UserForm props, validation, and submission behavior.
- Consumer count: 50 -> 48 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/vernier-caliper/VernierCaliperCalibration.tsx` to genuine v3 Input and Checkbox APIs.
- Preserved section activation, vernier readings, observed-error updates, set-as flags, row removal, repeatability, Type A integration, and all calibration calculations.
- Consumer count: 66 -> 65 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/surface-plate/SurfacePlateCalibration.tsx` to v3 Input and Spinner APIs.
- Preserved generated grid dimensions, numeric filtering, surface-plate readings, read-only behavior, and TypeA integration.
- Consumer count: 67 -> 66 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/bore-gauge/BoreGaugeCalibration.tsx` to v3 Input and Checkbox APIs.
- Preserved bore readings, mean/error calculations, set-as state, row validation, and TypeA/repeatability integration.
- Consumer count: 68 -> 67 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/fixed-ranges/FixedRangeCalibration.tsx` to v3 Input, Checkbox, and Button APIs.
- Preserved fixed-range readings, mean/error calculations, row deletion, set-as printing state, squareness input, and TypeA/repeatability sections.
- Consumer count: 69 -> 68 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/surface-roughness/SurfaceRoughnessCalibration.tsx` to v3 Input and Checkbox APIs.
- Preserved roughness readings, RA values, print flags, disabled state, RHF field paths, and TypeA integration.
- Consumer count: 70 -> 69 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/od-id-limit-gauges/GoNoGoGaugeCalibration.tsx` to the v3 Input API.
- Preserved GO/NO-GO specification displays, table-print selection, status/remark calculations, and TypeA observation integration.
- Consumer count: 71 -> 70 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/master-ring/RingGaugeCalibration.tsx` and `src/components/calibration/id-master/IDMasterCalibration.tsx` to the v3 Input API.
- Preserved specification/readings/mean field paths, generated reading behavior, read-only state, and TypeA integration.
- Consumer count: 73 -> 71 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/master-piece/MasterPeiceCalibration.tsx` to the v3 Input API.
- Preserved specification/readings/mean/error field paths, read-only behavior, generated readings, and TypeA integration.
- Consumer count: 74 -> 73 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated Input-only calibration consumers: `ComparatorStandCalibration.tsx`, `VBlockCalibration.tsx`, `BenchCenterCalibration.tsx`, and `SplineGaugeCalibration.tsx` to the v3 Input API.
- Preserved all RHF observation paths, read-only/disabled behavior, mean calculations, generated readings, and calibration values.
- Consumer count: 78 -> 74 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

## Current HeroUI v3 Checkpoint

- Completed in the latest continuation: `QuotationForm.tsx`, `RepeatabilitySection.tsx`, `CalibrationHistoryPanel.tsx`, `ObservationSection.tsx`, `TypeAReadingSection.tsx`, and `DialCalibrationTable.tsx`/`DialCalibration.tsx`.
- Remaining consumers: 78 source files importing `@heroui-v2/react`.
- Current family: calibration forms and mixed business components.
- Validation: TypeScript 0 errors, production build passed, lint passed with pre-existing warnings.
- Next exact task: continue migrating remaining calibration form consumers, then remove the v2 provider/CSS/package only after the import count reaches zero.

- Fully migrated `src/components/calibration/plunger-dials/DialCalibration.tsx` to v3 Input, Checkbox, and Spinner APIs.
- Preserved dial observation error calculations, read-only behavior, table-print selection state, RHF updates, and related repeatability/type-A sections.
- Consumer count: 79 -> 78 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/plunger-dials/DialCalibrationTable.tsx` to v3 Input controls with native table row/cell markup.
- Preserved actual/observed-error calculations, RHF field paths, generated error updates, and derived read-only values.
- Consumer count: 80 -> 79 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/od-id-limit-gauges/ObservationSection.tsx` and `TypeAReadingSection.tsx` to the v3 Input API.
- Preserved observation field paths, reading/mean synchronization, generated readings, validation, disabled states, and calibration calculation inputs.
- Consumer count: 82 -> 80 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/common/RepeatabilitySection.tsx` to the v3 Input API.
- Preserved RHF field names, validation, observation auto-sync, disabled state, and repeatability values.
- Consumer count: 84 -> 83 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/CalibrationHistoryPanel.tsx` to v3 Card, Chip, and Spinner plus the existing Shadcn/Base UI Accordion.
- Preserved cached/API history loading, sorting/filtering, expandable history, status/reference labels, and read-only observation rendering.
- Consumer count: 83 -> 82 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/billing/QuotationForm.tsx` to v3 compound Autocomplete, Select/ListBox, Label, Button, and Input field patterns.
- Preserved sender/customer/gauge selection, custom typed values, React Hook Form validation, quotation item payloads, discount behavior, and all pricing calculations.
- Consumer count: 85 -> 84 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/CalibrationEquipments/GaugeMasterSelector.tsx` to the v3 Autocomplete compound API with ListBox options and native v3 Input filtering.
- Preserved external selected-id synchronization, change callbacks, loading/empty states, validation messaging, and gauge-master option values while restoring rendered searchable options.
- Consumer count: 86 -> 85 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/billing/InvoiceItemsBillingTable.tsx` to v3 compound Autocomplete/ListBox gauge selection, Select/ListBox HSN, discount, and page-size controls, v3 Table collection, and compound Pagination.
- Preserved manual gauge selection, invoice HSN/rates/quantities/discounts, line-item calculations, add/remove callbacks, loading/empty states, and pagination.
- Consumer count: 88 -> 87 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/billing/QuotationItemsTable.tsx` to a v3 Table collection and shared compound Select/ListBox controls for discount and GST rates.
- Preserved editable quotation fields, duplicate/remove/save flows, GST calculations, terms and conditions, summary totals, and quotation store updates.
- Consumer count: 87 -> 86 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/billing/CreateInvoiceModal.tsx` from v2 HSN Select and numeric Inputs to v3 Select/ListBox and Input APIs.
- Preserved HSN entries, rate and quantity state, totals, validation/toasts, invoice creation, and preview behavior.
- Consumer count: 89 -> 88 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/InvoiceListTable.tsx` to v3 invoice action Popover/ListBox, Table collection, Input, Button, Select/ListBox, Chip-compatible content, and compound Pagination APIs.
- Preserved invoice lifecycle actions, status filters, search, visible columns, multi-selection, controlled/local pagination, loading/error/empty states, and invoice callbacks.
- Consumer count: 90 -> 89 source files importing `@heroui-v2/react`; all `src/components/Tables` v2 consumers are now migrated.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/LinkedGaugesTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Chip, Select/ListBox, and compound Pagination APIs.
- Preserved linked-gauge search/filter rendering, certificate and calibration actions, multi-selection, deletion confirmation, controlled/local pagination, and custom row behavior.
- Consumer count: 91 -> 90 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/InwardLinkedGaugesTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Chip, Select/ListBox, and compound Pagination APIs.
- Preserved linked-gauge filtering, controlled/local pagination, multi-selection and sticker selection, status rendering, custom actions, and loading/empty behavior.
- Consumer count: 92 -> 91 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/RepairTable.tsx` to v3 Table collection, Select/ListBox filters, Input, Button, Chip, and compound Pagination APIs.
- Preserved repair search, organization/type/status/date filters, sorting, multi-selection, create/edit/view/delete actions, loading/error states, and pagination callbacks.
- Consumer count: 93 -> 92 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/customerTable.tsx` to v3 Popover/ListBox action and column menus, Table collection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved organization transformation, search/filtering, visible columns, multi-selection, rate-card/settings actions, deletion confirmation, and server-backed pagination.
- Consumer count: 94 -> 93 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/ExistingGaugesTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved bulk gauge selection/addition, controlled/local pagination, search behavior, due-date rendering, sorting, loading states, and calibration callbacks.
- Consumer count: 95 -> 94 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/TaperThreadReadingsListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved specification/type filtering, sorting, controlled deletion confirmation, edit callbacks, loading/error/empty states, and page sizing.
- Consumer count: 96 -> 95 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/ThreadRingPlugListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved controlled/local pagination, search filtering, visible columns, multi-selection, thread/ring plug edit/delete flows, and loading/error/empty states.
- Consumer count: 97 -> 96 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/EquipmentMasterListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved local and controlled server pagination, equipment filtering/sorting, multi-selection, visible columns, refresh/loading/error states, and delete confirmation.
- Consumer count: 98 -> 97 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/ReadingMasterListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved reading-range formatting, sorting, filtering, navigation, delete confirmation, loading/error/empty states, and page sizing.
- Consumer count: 99 -> 98 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/EquipmentHistoryListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved equipment-history filtering, sorting, multi-selection, navigation, delete confirmation, refresh/loading/error states, and page sizing.
- Consumer count: 100 -> 99 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/DataSaveGaugesTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, Chip-compatible content, and compound Pagination APIs.
- Preserved saved-gauge filtering, sorting, visible columns, multi-selection, add/delete actions, loading/empty states, and page-size behavior.
- Consumer count: 101 -> 100 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/SurfacePlateReferenceStandardsListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, Select/ListBox, Chip, and compound Pagination APIs.
- Preserved tolerance sorting, visible-column selection, multi-selection, CRUD actions, loading/error/empty states, and server pagination.
- Consumer count: 102 -> 101 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/OptimizedInwardTable.tsx` to v3 Input, DatePicker/DateField/Calendar, Table collection, Button, and compound Pagination APIs across both virtualized and standard rendering paths.
- Preserved filtering, date selection, virtualization threshold, row actions, pagination calculations, and existing controller callbacks.
- Consumer count: 103 -> 102 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/InwardTable.tsx` to genuine v3 compound Table, Select/ListBox, DatePicker/DateField/Calendar, Input, Button, and Pagination APIs.
- Preserved controller-driven search, organization/date filters, server/client pagination, sorting, multi-selection, inward actions, loading, error, and empty states.
- Consumer count: 104 -> 103 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/OutwardTable.tsx` to v3 Table collection, Popover/ListBox visible-column selection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved URL-backed search and page sizing, multi-selection, sorting, outward open/print/delete actions, and loading/error/empty states.
- Consumer count: 105 -> 104 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/ScopeMasterListTable.tsx` to v3 Table collection, Input, Button, Select/ListBox, Chip, and compound Pagination APIs.
- Preserved server/client pagination, delegated search, master-gauge name mapping, range display, loading/error states, and CRUD callbacks.
- Consumer count: 106 -> 105 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/FormatNumberListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Input, Button, and compound Pagination APIs.
- Preserved format-number filtering, organization mapping, sortable data transformation, loading/error/empty rendering, and delete confirmation behavior.
- Consumer count: 107 -> 106 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/DialTableMasterListTable.tsx` to v3 Table collection, Input, Button, Select/ListBox, and compound Pagination APIs.
- Preserved dial-table search, page sizing, pagination, edit/delete actions, loading state, and error/empty rendering.
- Consumer count: 108 -> 107 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/CalibrationInwardTable.tsx` to v3 Table collection, Input, Chip, Select/ListBox, and compound Pagination APIs.
- Preserved inward filtering, pagination, loading/error/empty states, date formatting, and the existing calibration callback without changing calibration data or calculations.
- Consumer count: 109 -> 108 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/Tables/CompanyGaugeListTable.tsx` to v3 Table collection, Popover/ListBox column selection, Select/ListBox rows-per-page, compound Pagination, Input, Button, and existing v3-compatible DeleteConfirmModal.
- Preserved server/client pagination, visible columns, sorting, multi-selection, search, loading/error states, navigation, and delete callbacks.
- Consumer count: 110 -> 109 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/settings/user-management/UserForm.tsx` to v3 Button APIs and replaced the legacy Divider with a local separator.
- Preserved user form validation, permission editor wiring, role defaults, submit behavior, and close/loading gates.
- Consumer count: 51 -> 50 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/settings/user-management/UserResetPasswordModal.tsx` to genuine v3 Modal compound, Input, and Button APIs.
- Preserved Zod validation, backend field-error aliases, root error handling, reset-on-close behavior, password submission, and loading/close gates.
- Consumer count: 52 -> 51 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/settings/user-management/UserBasicDetails.tsx` to genuine v3 Input and TextArea APIs with local accessible labels and error rendering.
- Preserved all React Hook Form registrations, field names, password/user-type conditions, autocomplete behavior, and validation messages.
- Consumer count: 53 -> 52 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/pages/settings/profile.tsx` to genuine v3 Card, Input, and Button APIs.
- Preserved profile validation/submission, organization and lab display, signature preview/file selection, upload mutation, reset, and loading behavior.
- Consumer count: 54 -> 53 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/TaperThreadPlugGauge/TaperThreadPlugGauge.tsx` to genuine v3 Autocomplete/Trigger/Filter/Popover/ListBox and Input APIs.
- Preserved specification selection, loading/empty states, selected-value fallback mapping, dependent-field clearing, and all limit form calculations.
- Consumer count: 55 -> 54 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Removed the final HeroUI v2 Badge dependency from `src/components/header/NotificationDropdown.tsx` and retained equivalent unread-count indicators with local styling.
- Preserved notification querying, unread filtering, loading/empty states, mark-read mutation, and dropdown open/close behavior.
- Consumer count: 56 -> 55 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/layout/AppSidebar.tsx` to genuine v3 Popover/Menu and compound Avatar APIs.
- Preserved profile menu navigation, logout handling, user/avatar fallback rendering, sidebar layout, and permission-driven navigation.
- Consumer count: 57 -> 56 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/form/ReadingMasterForm.tsx` to genuine v3 Card and Autocomplete/ListBox APIs, plus v3 Input, Checkbox, and Button controls.
- Preserved gauge selection, static/dynamic mode, drag-and-drop reading order, validation, row deletion/addition, loading gates, and submit behavior.
- Consumer count: 58 -> 57 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/PlainTaperPlugGauge/PlainTaperPlugGauge.tsx` to genuine v3 Input and Button APIs.
- Preserved taper-angle input, Go/No-Go values, validation errors, debounced calculation requests, loading state, and form mappings.
- Consumer count: 59 -> 58 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/gaugeTypes/PlainThreadPlugGauge/PlainThreadPlugGauge.tsx` to genuine v3 Autocomplete/Trigger/Filter/Popover/ListBox, Input, and Button APIs.
- Preserved infinite specification loading, selection mapping, Go/No-Go form values, table calculation action, loading/empty states, and read-only rendering.
- Consumer count: 60 -> 59 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/plain-taper-plug-gauges/PlainTaperPlugGaugeCalibration.tsx` to genuine v3 Button and Input APIs.
- Preserved custom measurement/step rows, Go/No-Go limits, observed-size fields, remarks, validation, and calibration calculations.
- Consumer count: 61 -> 60 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/lever-dial/LeverDialCalibration.tsx` to genuine v3 Input, Checkbox, and Spinner APIs.
- Preserved directional readings, observed-error calculations, set-as print controls, validation, repeatability, and Type A integration.
- Consumer count: 62 -> 61 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/dial-type-gauge/DialSnapGaugeType.tsx` to genuine v3 Input and Checkbox APIs.
- Preserved dial/snap gauge readings, mean and observed-error behavior, Go/No-Go set-as controls, validation, row removal, and Type A/repeatability integration.
- Consumer count: 63 -> 62 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/thread-plug-ring-gauges/ThreadRingGaugeCalibration.tsx` to genuine v3 Input and Checkbox APIs.
- Preserved Go/No-Go controls, reading generation, observed-size and wear-limit calculations, remarks, validation, and all calibration form mappings.
- Consumer count: 64 -> 63 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/components/calibration/external-micrometer/ExternalMicrometerCalibration.tsx` to genuine v3 Input, Checkbox, and Button APIs.
- Preserved reading validation and generation, observed-error calculations, set-as behavior, master-setting columns, repeatability, Type A integration, and form/API field mappings.
- Consumer count: 65 -> 64 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Existing lint warnings remain outside this migration.

- Fully migrated `src/pages/settings/index.tsx` to genuine v3 Card and Tabs compound APIs.
- Preserved URL-driven tab selection, role-based tab visibility, authorization checks, and all settings page content.
- Consumer count: 24 -> 23 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/billing/invoice/edit.tsx` to genuine v3 Card, Select/ListBox, DatePicker/DateField/Calendar, Input, and Checkbox APIs.
- Preserved invoice edit fields, date synchronization, payment terms, PDF column configuration, line-item editing, GST/discount values, authorization locks, and update/generate payload behavior.
- Removed the final v2 provider/source boundary, deleted the unused legacy date adapter, removed `@heroui-v2/react`, and added direct dependencies for existing Chip, Framer Motion, and TanStack Virtual consumers.
- Consumer count: 4 -> 0 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false`, `npm run build`, and `npm run lint` passed. Lint retains pre-existing warnings only.

- Restored the original focused Vitest suite under `src/__tests__` and added the V2 Vitest configuration and test script.
- Validation: 16 test files passed, 96 tests passed; TypeScript, production build, and lint also passed.
- Runtime smoke check: Vite served the application successfully at HTTP 200. Route inventory matches the old frontend (72 routes); page inventory matches (66 files).
- Remaining runtime verification requires authenticated test credentials/data for end-to-end workflow checks.

- Source audit classified the 29 old-only files as replaced UI infrastructure, documentation, instrumentation, or legacy stylesheet/test artifacts; no old-only business page or route remains. All 72 route declarations and 66 page files match the original frontend inventory.
- Backend reachability check succeeded against the configured HTTPS API host; unauthenticated root response was HTTP 404 as expected.
- Public runtime smoke check passed for `/`, `/signin`, `/login`, `/signup`, and `/forgot-password` (HTTP 200 with the Vite entrypoint).
- Authenticated workflow verification remains blocked by unavailable test credentials/data and no browser automation runtime in the workspace.

- Standardized form control width at the shared level in `src/components/ui/form-field.tsx`: Input, Select, DatePicker, Autocomplete, and Textarea controls now fill their allocated grid columns without content-width shrinkage.
- Updated the shared Shadcn Select trigger to `w-full` and applied the same width contract to standalone HeroUI controls in equipment, gauge, reading, repair, scope, surface-plate, inward-gauge, and party forms.
- Preserved all RHF bindings, validation, checkbox behavior, date handling, and submitted values.
- Added a focused `FormField` width regression test covering a HeroUI v3 Input control.
- Validation: TypeScript passed, 17 test files/97 tests passed, production build passed, and lint passed.
- Representative form routes (`/transactions/inward/create`, `/transactions/outward/create`, `/billing/invoice/create`, `/masters/party-master/create`, and `/settings/users`) served successfully with HTTP 200 from Vite.

- Fully migrated `src/pages/transactions/Outward/[outwardId]/create-outward-invoice.tsx` and `src/pages/transactions/Outward/[outwardId]/edit-outward-invoice.tsx` to genuine v3 Table, Dropdown, Autocomplete, Select/ListBox, Pagination, Input, and Button APIs.
- Preserved outward invoice item flattening, HSN/rate/quantity editing, gauge selection, pagination, GST, packing, courier, subtotal, and final total calculations.
- Consumer count: 6 -> 4 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/transactions/calibration-certificate/nabl-process/[gaugeId].tsx` to genuine v3 Input, TextArea, and Select/ListBox APIs.
- Preserved certificate dates and metadata, calibration frequency/type values, observation/specification rendering, form submission, warning modal flow, and certificate payload behavior.
- Consumer count: 7 -> 6 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/transactions/calibration-certificate/page.tsx` to genuine v3 Tabs, Card, Select/ListBox, Input, and DatePicker/DateField/Calendar APIs.
- Preserved pending/completed certificate tabs, organization and lab filters, date ranges, search/reset/refresh behavior, pagination, certificate actions, and query/store integration.
- Consumer count: 8 -> 7 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/transactions/Inward/register-gauge.tsx` to genuine v3 Tabs, Card, and Modal APIs, with a local disclosure state helper replacing the v2 hook.
- Preserved gauge registration tabs, form state handoff, existing/data-save gauge tables, linked-gauge workflow, deletion confirmation, and sticker actions.
- Consumer count: 9 -> 8 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/billing/invoice/create.tsx` to genuine v3 Autocomplete/Filter/ListBox, Select/ListBox, DatePicker/DateField/Calendar, Card, Input, Checkbox, and Chip APIs.
- Preserved invoice header defaults, organization/outward selection, date strings, payment terms, PDF column selection, validation, draft payload construction, and navigation.
- Consumer count: 10 -> 9 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/components/form/InwardGaugeForm.tsx` to genuine v3 Select/ListBox, Autocomplete/Filter/ListBox, Accordion, Input, and Button APIs.
- Preserved gauge/certificate selection, grouped gauge search, subtype isolation and editing, specification loading, process selection, RHF validation, and submission callbacks.
- Consumer count: 11 -> 10 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/components/form/InwardForm.tsx` to genuine v3 Select/ListBox and DatePicker/DateField/Calendar APIs, with v3 Card, Checkbox, Input, Spinner, and Button usage.
- Preserved organization auto-population, RHF field names and validation, date conversion, conformity options, inward payload mapping, edit loading, and navigation behavior.
- Consumer count: 12 -> 11 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/settings/roles-permissions.tsx` to genuine v3 Card, Select/ListBox, Label, and Button APIs.
- Preserved user filtering, permission initialization/reset/save mutations, selected user state, loading/disabled behavior, and permission editor data.
- Consumer count: 23 -> 22 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/Dashboard/Home.tsx` to genuine v3 Card and Select/ListBox APIs.
- Preserved dashboard filter state, organization/status/period selection, refresh behavior, query gating, chart data, and all store/API interactions.
- Consumer count: 22 -> 21 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/settings/accounts.tsx` to genuine v3 Card, Table collection, Pagination, Chip, Button, Input, and compound Modal APIs.
- Preserved account filtering, pagination, CRUD mutations, delete confirmation, authorization checks, and AccountDetailsForm payloads.
- Consumer count: 21 -> 20 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/settings/users.tsx` to genuine v3 Tabs, Card, Input, Select/ListBox, Table collection, Pagination, Chip, Avatar, Button, and compound Modal APIs.
- Preserved directory switching, role/search filters, user pagination, CRUD/archive flows, permission payload handling, reset-password integration, and authorization behavior.
- Consumer count: 20 -> 19 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/billing/invoice/page.tsx` to genuine v3 Input, Select/ListBox, TextArea, Button, and compound Modal APIs.
- Preserved invoice filters, payment mode/date/reference/remarks fields, payment and cancellation workflows, status calculations, and existing invoice payloads.
- Consumer count: 19 -> 18 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/settings/laboratories.tsx` to genuine v3 Card, Input, Select/ListBox, Autocomplete/Filter/ListBox, and Button APIs.
- Preserved laboratory payload construction, validation, country/state selection, contact editing, platform access recovery, customer assignment mutations, and authorization behavior.
- Consumer count: 18 -> 17 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/pages/transactions/Outward/[outwardId].tsx` to genuine v3 Tabs, Card, Input, Select/ListBox, Chip, and Table collection APIs.
- Preserved outward/inward gauge selection, filtering, add/remove actions, bulk actions, status rendering, printing, loading states, and pending-status confirmation flow.
- Consumer count: 17 -> 16 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/components/form/OutwardForm.tsx` to genuine v3 Select/ListBox and DatePicker/DateField/Calendar APIs.
- Preserved RHF validation, selected organization and date values, outward date conversion, transport field, API payload mapping, and navigation behavior.
- Consumer count: 16 -> 15 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/components/form/PartyMasterForm.tsx` to genuine v3 Select/ListBox, Autocomplete/Filter/ListBox, Input, Checkbox, Card, and Button APIs.
- Preserved organization form defaults, RHF field names and validation, contact editing, country/state behavior, contract options, query-cache updates, and create/update payloads.
- Consumer count: 15 -> 14 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/components/form/RepairForm.tsx` to genuine v3 Select/ListBox, Autocomplete/Filter/ListBox, TextArea, Card, Button, Input, and Table collection APIs.
- Preserved repair form fields, gauge selection/specification behavior, spare-part editing and cost calculations, RHF submission data, and callbacks.
- Consumer count: 14 -> 13 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Fully migrated `src/components/form/ScopeMasterForm.tsx` to genuine v3 labeled Input, Autocomplete/Filter/ListBox, DatePicker/DateField/Calendar, and Button APIs.
- Preserved scope defaults, gauge/unit/location selections, validity date conversion, equipment selection, validation, create/update payloads, and navigation callbacks.
- Consumer count: 13 -> 12 source files importing `@heroui-v2/react`.
- Validation: `npx tsc -b --pretty false` and `npm run build` passed.

- Standardized form control sizing through `src/components/ui/form-field.tsx` and the shared Shadcn `SelectTrigger`, ensuring Inputs, Selects, DatePickers, Autocompletes, and Textareas fill their grid columns without changing form state or submission behavior.
- Applied explicit full-width sizing to standalone controls across equipment, gauge, reading, inward, party, repair, scope, surface-plate, thread, and taper forms. Normalized form-only surfaces to compact `rounded-md` corners and subtle `shadow-sm` elevation.
- Added a focused `FormField` width regression test. Validation: `npx tsc -b --pretty false` passed, 17 test files/97 tests passed, `npm run build` passed, and `npm run lint` exited successfully with existing warnings only.
- Standardized the shared Shadcn `Input`, `SelectTrigger`, `Textarea`, and `Button` primitives to 40px regular controls, compact `rounded-md` corners, and preserved focus indicators. Shared `FormField` selectors now apply the same sizing to HeroUI v3 controls used by migrated forms.
- HTTP smoke checks returned 200 for `/transactions/inward/create`, `/transactions/inward`, `/transactions/outward/create`, and `/billing/invoice/create`. Authenticated visual interaction testing remains unavailable because no browser runner or test credentials are configured.
- Completed the remaining form-directory sizing audit, including `RegisterGaugeForm`, `ValidatedInput`, standalone Scope/Inward date pickers, and nested Autocomplete inputs. Validation remains clean: TypeScript passed, 17 test files/97 tests passed, and production build passed.
- Replaced the remaining native grade selector in `CalibrationMethodForm` and all legacy Shadcn Select usage in `RegisterGaugeForm` with HeroUI v3 `Select`/`ListBox` compound controls. Preserved selected values, validation, defaults, and `setValue` submission behavior. TypeScript, tests, build, and lint remain passing.
- Normalized remaining form section headers and the shared Shadcn Card primitive from oversized `rounded-xl` styling to compact `rounded-md`, preserving subtle borders, focus states, and all form behavior.
- Tightened `ValidatedInput` string validation types and `CalibrationMethodForm` calculation payload typing without changing validation or calculation behavior. TypeScript, 97 tests, and production build remain passing.
- Finished the form-directory control audit: the remaining drag-reorder action now has a compact accessible focus target, while the only raw inputs left are intentional hidden business fields. TypeScript and production build remain passing.
- Extended the compact form surface standard to auth, account details, and rate-card forms: replaced oversized auth card radii, normalized rate-card/account section radii, and reduced reset-password button height to the regular 40px control height. No form behavior or API contracts changed.
- Added explicit full-width control sizing to reusable account, quotation, and rate-card form helpers, covering standalone HeroUI Inputs, Select triggers, Textareas, and Autocomplete filters. TypeScript, 97 tests, and production build remain passing.
- Extended the same width contract to user-management basic details, role selectors, and reset-password fields. Preserved RHF registration, selected values, error rendering, and permission behavior. TypeScript, tests, and build remain passing.
- Browser smoke verification found and fixed the auth form runtime issues: sign-in password width now matches the identifier field, HeroUI v3 checkbox controls are visible and preserve boolean form values, sign-up consent content stays aligned, and the auth flex wrapper no longer overflows at mobile width. Desktop screenshots showed aligned controls; a 390px CSS viewport measured `scrollWidth === clientWidth` with both inputs fitting the viewport.
- Chrome DevTools interaction smoke verified the sign-in `rememberMe` checkbox changes from `false` to `true` on click, with 1440px viewport and document widths equal. This confirms the visible HeroUI v3 checkbox remains connected to the existing RHF field.

- Fixed the shared server-pagination table rendering bug affecting certificate-linked gauges and other paginated tables. Existing rows were replaced with an empty collection whenever React Query reported a background `isFetching` state, allowing the total count to remain visible while hiding valid rows. Linked gauges, inward-linked gauges, equipment master, and scope master tables now retain their current rows during refetches and still show loading/empty content when no rows exist. Removed temporary certificate-page diagnostics. TypeScript passed, 97 tests passed, production build passed, and lint exited successfully with existing warnings only. Current source scan reports zero `@heroui-v2/react` consumers.

- Table inventory audit: 23 shared table components under `src/components/Tables` use genuine HeroUI v3 collections; business families covered are inward/gauge, calibration/certificate, outward, billing/rate cards, customers, equipment/maintenance, and master data. Standardized the two remaining table surfaces (`DataSaveGaugesTable` and `ExistingGaugesTable`) onto the shared industrial table wrapper. Data rendering and protected-route interaction still require authenticated browser verification against the test backend.

- Hardened `src/shared/components/VirtualizedTable.tsx`, used by large inward datasets: replaced broad row/column `any` types with generics, preserved the virtualization threshold and row callbacks, and aligned the virtualized header/body/footer with the industrial table treatment. TypeScript, 97 tests, production build, and lint pass.

- Extended the industrial table surface to `QuotationItemsTable`, settings accounts, and settings users. These HeroUI v3 collection tables retain their existing editing, filtering, permissions, pagination, and row actions. TypeScript, build, 97 tests, and lint pass.

- Fixed the HeroUI v3 collection invariant across all 27 audited table surfaces by marking the first data column as `isRowHeader`. This resolves the `A table must have at least one Column with the isRowHeader prop set to true` runtime failure in `InwardTable` and prevents the same failure in sibling tables without changing row data or actions. TypeScript, build, 99 tests, and lint pass.

- Fixed empty table rows in `InwardTable` and sibling dynamic HeroUI v3 tables. The DOM contained `<tr>` elements but no cells because render-prop rows were missing their required `columns` collection. Each dynamic row now receives the matching header column collection, preserving existing cell renderers, sorting, selection, pagination, and actions. TypeScript, production build, 99 tests, and lint pass.

- Hardened `extractPaginatedList` for API responses whose rows and pagination metadata are nested under `data`. Added regression coverage for nested and root pagination shapes. TypeScript, build, lint, and 99 tests pass; the live endpoint remains authentication-protected (`401` without a bearer token).
- Corrected HeroUI v3 dynamic table rows to receive the original column objects and extract each column's `uid`/`key` before rendering. This preserves React Aria's collection contract and fixes rows that appeared as `N/A` or had no visible cell values across inward, certificate, outward, billing, settings, and master-data tables.
- Normalized the outward list query at the API boundary with `extractPaginatedList`, so paginated `{ data, pagination }` responses are converted to the `OutwardEntry[]` expected by `OutwardTable`. This removes the `data is not iterable` runtime error without changing the backend response or payload contracts.
