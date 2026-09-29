# Table Migration Inventory

Inventory of table surfaces reviewed during the HeroUI v3 migration. `Runtime` remains pending where the route requires authenticated backend data.

| Component | Family | Library | Data / operations | Status | Runtime |
| --- | --- | --- | --- | --- | --- |
| `CalibrationInwardTable` | Inward | HeroUI v3 | Local filter, pagination, actions | Migrated | Pending auth |
| `CompanyGaugeListTable` | Gauge register | HeroUI v3 | Query data, sort, selection, pagination | Migrated | Pending auth |
| `DataSaveGaugesTable` | Gauge register | HeroUI v3 | Local sort, selection, pagination | Migrated | Pending auth |
| `ExistingGaugesTable` | Gauge register | HeroUI v3 | Local sort, selection, pagination | Migrated | Pending auth |
| `InwardTable` | Inward | HeroUI v3 | Query data, filter, sort, selection, pagination | Migrated | Pending auth |
| `OptimizedInwardTable` | Inward | HeroUI v3 + typed virtualizer | Local filter, pagination, row actions | Migrated | Pending auth |
| `LinkedGaugesTable` | Calibration certificate | HeroUI v3 | Server pagination, search, sort, selection, columns | Migrated | Pending auth |
| `InwardLinkedGaugesTable` | Calibration certificate | HeroUI v3 | Server/local pagination, sort, selection, stickers | Migrated | Pending auth |
| `OutwardTable` | Outward | HeroUI v3 | Query data, sort, selection, pagination | Migrated | Pending auth |
| `InvoiceListTable` | Billing | HeroUI v3 | Query data, filter, sort, selection, pagination | Migrated | Pending auth |
| `RateCardTable` | Billing | HeroUI v3 | Query data, sort, pagination, actions | Migrated | Pending auth |
| `EquipmentMasterListTable` | Maintenance | HeroUI v3 | Query data, sort, selection, pagination | Migrated | Pending auth |
| `EquipmentHistoryListTable` | Maintenance | HeroUI v3 | Query data, sort, pagination | Migrated | Pending auth |
| `RepairTable` | Maintenance | HeroUI v3 | Query data, filters, sort, pagination | Migrated | Pending auth |
| `RepairMasterTable` | Maintenance | HeroUI v3 | Query data, filter, sort, pagination | Migrated | Pending auth |
| `customerTable` | Customers | HeroUI v3 | Query data, search, sort, selection, pagination | Migrated | Pending auth |
| `DialTableMasterListTable` | Master data | HeroUI v3 | Query data, filter, pagination, actions | Migrated | Pending auth |
| `FormatNumberListTable` | Master data | HeroUI v3 | Query data, sort, pagination, actions | Migrated | Pending auth |
| `ReadingMasterListTable` | Master data | HeroUI v3 | Query data, sort, pagination, actions | Migrated | Pending auth |
| `ScopeMasterListTable` | Master data | HeroUI v3 | Query data, pagination, actions | Migrated | Pending auth |
| `SurfacePlateReferenceStandardsListTable` | Master data | HeroUI v3 | Query data, filter, sort, pagination | Migrated | Pending auth |
| `TaperThreadReadingsListTable` | Master data | HeroUI v3 | Query data, filter, sort, pagination | Migrated | Pending auth |
| `ThreadRingPlugListTable` | Master data | HeroUI v3 | Query data, filter, sort, pagination | Migrated | Pending auth |

Additional reviewed consumers: `InvoiceItemsBillingTable`, `QuotationItemsTable`, settings accounts, and settings users. They use HeroUI v3 collections and now share the industrial table wrapper; their authenticated data workflows remain pending browser verification.

Known shared fixes: server-paginated tables no longer replace valid rows with an empty collection during background refetches, and nested API pagination metadata is preserved during normalization. Current source scan: zero `@heroui-v2/react` consumers under `src/components/Tables`.

All 27 audited HeroUI v3 tables now declare a row-header column, satisfying the collection accessibility/runtime invariant.
