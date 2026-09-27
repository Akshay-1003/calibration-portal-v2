# Layout Components

This directory contains layout components designed to solve common UI layout issues and provide consistent spacing throughout the application.

## Components

### PageContainer
A wrapper component that ensures proper page layout and prevents footer overlap issues.

```tsx
import { PageContainer } from "../components/layout/PageContainer";

function MyPage() {
  return (
    <PageContainer>
      {/* Your page content */}
    </PageContainer>
  );
}
```

**Props:**
- `children`: React.ReactNode - The page content
- `className?`: string - Additional CSS classes
- `withPadding?`: boolean (default: true) - Whether to add bottom padding to prevent footer overlap

### TableContainer
A responsive container for tables that handles proper scrolling and height management.

```tsx
import { TableContainer } from "../components/layout/PageContainer";

function MyTable() {
  return (
    <TableContainer>
      <Table>
        {/* Your table content */}
      </Table>
    </TableContainer>
  );
}
```

**Props:**
- `children`: React.ReactNode - The table content
- `className?`: string - Additional CSS classes
- `maxHeight?`: string (default: "calc(100vh-300px)") - Maximum height of the table
- `minHeight?`: string (default: "400px") - Minimum height of the table

### ResponsiveTableWrapper
A wrapper for table components that provides consistent padding and spacing.

```tsx
import { ResponsiveTableWrapper } from "../components/layout/PageContainer";

function MyTableComponent() {
  return (
    <ResponsiveTableWrapper>
      {/* Your table controls and table */}
    </ResponsiveTableWrapper>
  );
}
```

### TablePageWrapper
A flexible, production-ready layout component for table pages with multiple layout variants.

```tsx
import { TablePageWrapper } from "../components/layout/TablePageWrapper";

// Basic Layout (most common)
function BasicTablePage() {
  return (
    <TablePageWrapper
      layout="basic"
      title="User Management"
      description="Manage user accounts and permissions"
      actions={<Button>Add User</Button>}
      table={<UserTable />}
    />
  );
}

// Filter Layout (with search/filters)
function FilterTablePage() {
  return (
    <TablePageWrapper
      layout="filter"
      title="Product Inventory"
      description="Search and filter products"
      actions={<Button>Add Product</Button>}
      filters={<ProductFilters />}
      table={<ProductTable />}
    />
  );
}

// Sidebar Layout (with additional panel)
function SidebarTablePage() {
  return (
    <TablePageWrapper
      layout="sidebar"
      title="Analytics Dashboard"
      description="View detailed analytics"
      actions={<Button>Create Report</Button>}
      sidebar={<AnalyticsSidebar />}
      table={<AnalyticsTable />}
    />
  );
}
```

**Layout Variants:**
- `basic`: Header + Table (default)
- `filter`: Header + Filters + Table
- `sidebar`: Header + Sidebar + Table

**Props:**
- `layout`: Layout variant
- `compact`: Reduces spacing for dense layouts
- `title`, `description`, `actions`: Header content
- `filters`, `sidebar`, `table`: Section content
- Custom styling: `className`, `headerClassName`, `contentClassName`
```

## Layout Improvements Made

### 1. Footer Overlap Prevention
- Added `pb-24` (96px) bottom padding to main layout
- Added `pb-20` (80px) bottom padding to PageContainer
- Added `pb-8` (32px) bottom margin to table components

### 2. Responsive Table Heights
- Changed from fixed `max-h-[600px]` to responsive `max-h-[calc(100vh-300px)]`
- Added minimum height constraints to prevent tables from being too small
- Added proper border and rounded corners for better visual separation

### 3. Improved Spacing
- Increased padding from `p-2` to `p-4` for better breathing room
- Added `mb-4` spacing between controls and tables
- Added `pb-8` bottom padding to table containers

### 4. Better Visual Hierarchy
- Updated table headers with better contrast (`bg-gray-50` instead of `bg-gray-100`)
- Added hover effects to table rows
- Improved pagination styling with background and border

### 5. Global CSS Utilities
Added utility classes in `globals.css`:
- `.page-container` - For consistent page layout
- `.table-container` - For table spacing
- `.table-wrapper` - For responsive table behavior
- `.main-content` - For main content area spacing

## Usage Guidelines

1. **Always use PageContainer** for full-page components to prevent footer overlap
2. **Use TableContainer** for scrollable tables with proper height management
3. **Use ResponsiveTableWrapper** for table components that need consistent spacing
4. **Use TablePageWrapper** for complete table pages with standardized layouts

## Migration Guide

To update existing components:

1. Wrap page components with `PageContainer`
2. Replace table containers with `TableContainer`
3. Update table component padding from `p-2` to `p-4`
4. Change table max-height from fixed values to responsive calculations
5. Add proper bottom margins to prevent content cutoff

This ensures consistent layout behavior across the entire application and prevents the white footer overlap issue.