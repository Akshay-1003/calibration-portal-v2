# TablePageWrapper Migration Guide

This guide helps you migrate existing pages to use the new TablePageWrapper with explicit layout variants.

## 🎯 **Migration Strategy**

### Phase 1: Immediate (Backward Compatible)
All existing implementations continue to work without changes. The new TablePageWrapper is 100% backward compatible.

### Phase 2: Gradual Migration (Recommended)
Migrate pages one by one to use explicit layout props for better maintainability.

### Phase 3: Cleanup (Optional)
Remove legacy usage patterns once all pages are migrated.

## 📋 **Current Page Inventory**

### Pages Using TablePageWrapper:
1. `src/pages/masters/GaugesMaster/page.tsx` - Basic layout
2. `src/pages/transactions/Inward/page.tsx` - Basic layout
3. `src/pages/transactions/calibration-inward/page.tsx` - Basic layout
4. `src/pages/transactions/calibration/page.tsx` - Basic layout

### Pages That Should Use TablePageWrapper:
1. `src/pages/transactions/Inward/linked-gauges.tsx` - Filter layout (has custom filters)
2. `src/pages/dashboard/home.tsx` - Custom layout (keep as is)

## 🔄 **Migration Examples**

### Example 1: Basic Migration (GaugesMaster)

**Before** (current - works fine):
```tsx
<TablePageWrapper
  title="Gauge Master List"
  description="Manage your gauge master entries and specifications"
  actions={
    <Button onClick={() => navigate('/masters/gauges-master/create')}>
      Create Gauge Master
    </Button>
  }
>
  <div className="w-full">
    <CompanyGaugeListTable 
      data={gauges}
      onAddGauge={addGauge}
      onDeleteGauge={deleteGauge}
      loading={loading}
      error={error}
      onRefresh={refreshGauges}
      linkedGaugeIds={[]}
    />
  </div>
</TablePageWrapper>
```

**After** (recommended):
```tsx
<TablePageWrapper
  layout="basic"
  title="Gauge Master List"
  description="Manage your gauge master entries and specifications"
  actions={
    <Button onClick={() => navigate('/masters/gauges-master/create')}>
      Create Gauge Master
    </Button>
  }
  table={
    <CompanyGaugeListTable 
      data={gauges}
      onAddGauge={addGauge}
      onDeleteGauge={deleteGauge}
      loading={loading}
      error={error}
      onRefresh={refreshGauges}
      linkedGaugeIds={[]}
    />
  }
/>
```

**Changes:**
- ✅ Added `layout="basic"`
- ✅ Moved table from `children` to `table` prop
- ✅ Removed wrapper `<div className="w-full">`

### Example 2: Filter Layout Migration (linked-gauges)

**Before** (custom implementation):
```tsx
<div className="space-y-6 pb-8">
  {/* Custom header */}
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Linked Gauges
        </h1>
        <p className="text-gray-600">
          Search and filter linked gauges across all inward entries
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleRefresh}>Refresh</Button>
      </div>
    </div>
  </div>


  <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-4">
    <LinkedGaugesTable data={filteredData} loading={loading} />
  </div>
</div>
```

**After** (using TablePageWrapper):
```tsx
<TablePageWrapper
  layout="filter"
  title="Linked Gauges"
  description="Search and filter linked gauges across all inward entries"
  actions={
    <Button onClick={handleRefresh}>
      Refresh
    </Button>
  }
  filters={
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Filter Gauges
          </h3>
          <p className="text-sm text-gray-600">
            Apply filters to search for specific gauges
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={applyFilters} size="sm">
            Search
          </Button>
          <Button variant="outline" onClick={clearFilters} size="sm">
            Clear Filters
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Filter controls */}
      </div>
    </div>
  }
  table={
    <LinkedGaugesTable 
      data={filteredData} 
      loading={loading}
    />
  }
/>
```

**Benefits:**
- ✅ Consistent styling with other pages
- ✅ Reduced custom CSS
- ✅ Better responsive behavior
- ✅ Automatic dark mode support

## 🛠️ **Step-by-Step Migration Process**

### Step 1: Identify Layout Type
For each page, determine the appropriate layout:

```bash
# Basic Layout (Header + Table)
- Simple CRUD pages
- List pages without filters
- Most master data pages

# Filter Layout (Header + Filters + Table)
- Pages with search functionality
- Pages with multiple filter options
- Report pages with parameters

# Sidebar Layout (Header + Sidebar + Table)
- Dashboard pages
- Pages with additional navigation
- Pages with contextual information
```

### Step 2: Extract Components
Identify the components for each section:

```tsx
// Extract these from your current implementation:
const title = "Page Title";
const description = "Page description";
const actions = <Button>Action</Button>;
const filters = <FilterComponent />; // If applicable
const table = <TableComponent />;
const sidebar = <SidebarComponent />; // If applicable
```

### Step 3: Apply New Structure
Replace the old implementation:

```tsx
<TablePageWrapper
  layout="basic" // or "filter" or "sidebar"
  title={title}
  description={description}
  actions={actions}
  filters={filters} // Only for filter layout
  sidebar={sidebar} // Only for sidebar layout
  table={table}
/>
```

### Step 4: Test and Validate
- ✅ Visual appearance matches original
- ✅ Responsive behavior works correctly
- ✅ Dark mode functions properly
- ✅ All interactions work as expected

## 📝 **Migration Checklist**

### For Each Page:
- [ ] Identify current layout pattern
- [ ] Determine appropriate layout variant
- [ ] Extract title, description, actions
- [ ] Extract table component
- [ ] Extract filters (if applicable)
- [ ] Extract sidebar (if applicable)
- [ ] Apply new TablePageWrapper structure
- [ ] Test visual appearance
- [ ] Test responsive behavior
- [ ] Test dark mode
- [ ] Test all interactions
- [ ] Update any custom CSS if needed

### Project-Wide:
- [ ] Update all table pages to use explicit layouts
- [ ] Remove custom layout CSS where possible
- [ ] Update documentation
- [ ] Train team on new patterns
- [ ] Establish code review guidelines

## 🚨 **Common Migration Issues**

### Issue 1: Custom Styling Conflicts
**Problem**: Existing custom CSS conflicts with new layout
**Solution**: Use `className`, `headerClassName`, `contentClassName` props

```tsx
<TablePageWrapper
  className="custom-page-styles"
  headerClassName="custom-header-styles"
  contentClassName="custom-content-styles"
  // ... other props
/>
```

### Issue 2: Complex Filter Logic
**Problem**: Existing filter implementation is too complex
**Solution**: Keep complex logic, just move to `filters` prop

```tsx
const complexFilters = (
  <div>
    {/* Your existing complex filter implementation */}
  </div>
);

<TablePageWrapper
  layout="filter"
  filters={complexFilters}
  // ... other props
/>
```

### Issue 3: Nested Wrapper Divs
**Problem**: Extra wrapper divs causing layout issues
**Solution**: Remove unnecessary wrappers

```tsx
// Before
<TablePageWrapper>
  <div className="w-full">
    <div className="container">
      <MyTable />
    </div>
  </div>
</TablePageWrapper>

// After
<TablePageWrapper
  table={<MyTable />}
/>
```

## 🎯 **Success Metrics**

After migration, you should see:
- ✅ Consistent visual appearance across all table pages
- ✅ Reduced custom CSS code
- ✅ Better responsive behavior
- ✅ Improved maintainability
- ✅ Faster development of new table pages
- ✅ Better dark mode support

## 📞 **Support**

If you encounter issues during migration:
1. Check the examples in `TablePageWrapper.examples.tsx`
2. Review the documentation in `TablePageWrapper.md`
3. Look at successfully migrated pages for reference
4. Test with the legacy implementation first to ensure backward compatibility