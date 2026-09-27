# TablePageWrapper Documentation

A flexible, production-ready layout component for table pages that supports multiple layout variants and consistent styling across the project.

## 🎯 **Purpose**

TablePageWrapper provides a standardized layout system for table pages with:
- Consistent header structure (title, description, actions)
- Flexible content areas (filters, sidebar, table)
- Responsive design and dark mode support
- Multiple layout variants for different use cases

## 📋 **Interface**

```typescript
interface TablePageWrapperProps {
  // Content props
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  table?: React.ReactNode;
  sidebar?: React.ReactNode;
  children?: React.ReactNode; // Legacy support
  
  // Layout configuration
  layout?: "basic" | "filter" | "sidebar";
  compact?: boolean;
  
  // Styling props
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}
```

## 🏗️ **Layout Variants**

### 1. Basic Layout (Default)
**Use for**: Simple table pages with header and table only
```tsx
<TablePageWrapper
  layout="basic"
  title="User Management"
  description="Manage user accounts and permissions"
  actions={<Button>Add User</Button>}
  table={<UserTable />}
/>
```

**Structure**:
```
┌─────────────────────────────────────┐
│ Header (Title + Description + Actions) │
├─────────────────────────────────────┤
│ Table Content                       │
└─────────────────────────────────────┘
```

### 2. Filter Layout
**Use for**: Pages with search/filter functionality
```tsx
<TablePageWrapper
  layout="filter"
  title="Product Inventory"
  description="Search and filter products"
  actions={<Button>Add Product</Button>}
  filters={<ProductFilters />}
  table={<ProductTable />}
/>
```

**Structure**:
```
┌─────────────────────────────────────┐
│ Header (Title + Description + Actions) │
├─────────────────────────────────────┤
│ Filters Section                     │
├─────────────────────────────────────┤
│ Table Content                       │
└─────────────────────────────────────┘
```

### 3. Sidebar Layout
**Use for**: Pages with additional navigation or info panel
```tsx
<TablePageWrapper
  layout="sidebar"
  title="Analytics Dashboard"
  description="View detailed analytics"
  actions={<Button>Create Report</Button>}
  sidebar={<AnalyticsSidebar />}
  table={<AnalyticsTable />}
/>
```

**Structure**:
```
┌─────────────────────────────────────┐
│ Header (Title + Description + Actions) │
├─────────┬───────────────────────────┤
│ Sidebar │ Table Content             │
│         │                           │
│         │                           │
└─────────┴───────────────────────────┘
```

## 🎨 **Styling Features**

### Consistent Design System
- **Cards**: White background with subtle shadows and borders
- **Spacing**: Consistent 6-unit spacing (24px) between sections
- **Typography**: Standardized heading and text sizes
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Full dark mode support

### Customization Options
```tsx
<TablePageWrapper
  compact={true}                    // Reduces spacing for dense layouts
  className="max-w-6xl mx-auto"     // Custom container styling
  headerClassName="bg-blue-50"      // Custom header styling
  contentClassName="border-blue-200" // Custom content styling
/>
```

## 📖 **Usage Guidelines**

### When to Use Each Layout

| Layout | Use Case | Examples |
|--------|----------|----------|
| **Basic** | Simple table pages | User lists, basic CRUD operations |
| **Filter** | Pages with search/filtering | Product catalogs, filtered reports |
| **Sidebar** | Pages with additional context | Dashboards, settings pages |

### Best Practices

1. **Keep Actions Minimal**: 1-3 action buttons maximum
2. **Descriptive Titles**: Clear, concise page titles
3. **Helpful Descriptions**: Brief explanation of page purpose
4. **Consistent Filters**: Use standard filter patterns
5. **Responsive Design**: Test on mobile devices

### Filter Section Guidelines

```tsx
// Good: Clear structure with proper spacing
const filters = (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold">Filter Products</h3>
        <p className="text-sm text-gray-600">Use filters to find specific items</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm">Apply</Button>
        <Button variant="outline" size="sm">Clear</Button>
      </div>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
      {/* Filter controls */}
    </div>
  </div>
);
```

### Sidebar Content Guidelines

```tsx
// Good: Organized sections with clear hierarchy
const sidebar = (
  <div className="space-y-6">
    <div>
      <h3 className="font-semibold mb-3">Quick Actions</h3>
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full justify-start">
          Export Data
        </Button>
      </div>
    </div>
    
    <div>
      <h3 className="font-semibold mb-3">Statistics</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Total:</span>
          <span className="font-medium">1,234</span>
        </div>
      </div>
    </div>
  </div>
);
```

## 🔄 **Migration Guide**

### From Legacy Implementation

**Before**:
```tsx
<TablePageWrapper
  title="My Table"
  description="Table description"
  actions={<Button>Action</Button>}
>
  <MyTable />
</TablePageWrapper>
```

**After** (no changes needed - backward compatible):
```tsx
<TablePageWrapper
  title="My Table"
  description="Table description"
  actions={<Button>Action</Button>}
>
  <MyTable />
</TablePageWrapper>
```

**Recommended** (explicit layout):
```tsx
<TablePageWrapper
  layout="basic"
  title="My Table"
  description="Table description"
  actions={<Button>Action</Button>}
  table={<MyTable />}
/>
```

### Adding Filters to Existing Pages

```tsx
// 1. Change layout to "filter"
// 2. Move table to table prop
// 3. Add filters prop

<TablePageWrapper
  layout="filter"  // Changed from "basic"
  title="My Table"
  description="Table description"
  actions={<Button>Action</Button>}
  filters={<MyFilters />}  // Added
  table={<MyTable />}      // Moved from children
/>
```

## 🚀 **Implementation Examples**

### Real Project Examples

1. **Gauge Master List** (Basic Layout):
```tsx
<TablePageWrapper
  layout="basic"
  title="Gauge Master List"
  description="Manage your gauge master entries and specifications"
  actions={
    <Button onClick={() => navigate('/create')}>
      Create Gauge Master
    </Button>
  }
  table={
    <CompanyGaugeListTable 
      data={gauges}
      loading={loading}
      error={error}
    />
  }
/>
```

2. **Inward List with Filters** (Filter Layout):
```tsx
<TablePageWrapper
  layout="filter"
  title="Inward List"
  description="Manage your inward data with advanced filtering"
  actions={
    <Button onClick={() => navigate('/create')}>
      Create Inward
    </Button>
  }
  filters={
    <InwardFilters
      onFilter={handleFilter}
      onClear={handleClear}
    />
  }
  table={
    <InwardTable 
      data={filteredData}
      loading={loading}
    />
  }
/>
```

3. **Analytics Dashboard** (Sidebar Layout):
```tsx
<TablePageWrapper
  layout="sidebar"
  title="Analytics Dashboard"
  description="View detailed analytics and reports"
  actions={
    <Button onClick={downloadReport}>
      Download Report
    </Button>
  }
  sidebar={
    <AnalyticsSidebar
      stats={stats}
      quickActions={quickActions}
    />
  }
  table={
    <AnalyticsTable 
      data={analyticsData}
      loading={loading}
    />
  }
/>
```

## 🔧 **Technical Details**

### Responsive Breakpoints
- **Mobile**: Single column, stacked layout
- **Tablet**: Optimized spacing and button sizes
- **Desktop**: Full layout with proper sidebars

### Dark Mode Support
All components automatically support dark mode through Tailwind's dark mode classes.

### Accessibility
- Proper heading hierarchy (h1 for titles)
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader friendly

### Performance
- Minimal re-renders through proper prop structure
- Conditional rendering for unused sections
- Optimized CSS classes

## 📝 **Changelog**

### v2.0.0 (Current)
- ✅ Added layout variants (basic, filter, sidebar)
- ✅ Added compact mode
- ✅ Added custom styling props
- ✅ Improved responsive design
- ✅ Enhanced dark mode support
- ✅ Backward compatibility maintained

### v1.0.0 (Legacy)
- Basic header + content layout
- Title, description, actions support
- Simple card-based design