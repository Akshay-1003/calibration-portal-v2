
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TablePageWrapper } from './TablePageWrapper';

// Mock table component for examples
const MockTable = ({ title }: { title: string }) => (
  <div className="p-6">
    <div className="text-center text-gray-500">
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm mt-2">Table content would go here</p>
    </div>
  </div>
);

// Mock sidebar component for examples
const MockSidebar = () => (
  <div className="space-y-4">
    <h3 className="font-semibold text-gray-900">Quick Actions</h3>
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="w-full justify-start">
        Export Data
      </Button>
      <Button variant="outline" size="sm" className="w-full justify-start">
        Import Data
      </Button>
      <Button variant="outline" size="sm" className="w-full justify-start">
        Settings
      </Button>
    </div>
    <hr className="my-4" />
    <h3 className="font-semibold text-gray-900">Statistics</h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Total Records:</span>
        <span className="font-medium">1,234</span>
      </div>
      <div className="flex justify-between">
        <span>Active:</span>
        <span className="font-medium text-green-600">1,100</span>
      </div>
      <div className="flex justify-between">
        <span>Inactive:</span>
        <span className="font-medium text-red-600">134</span>
      </div>
    </div>
  </div>
);

/**
 * Example 1: Basic Layout
 * Most common layout for simple table pages
 */
export const BasicLayoutExample = () => (
  <TablePageWrapper
    layout="basic"
    title="User Management"
    description="Manage user accounts and permissions"
    actions={
      <>
        <Button variant="outline">
          Export
        </Button>
        <Button>
          Add User
        </Button>
      </>
    }
    table={<MockTable title="User Table" />}
  />
);

/**
 * Example 2: Filter Layout
 * For pages that need search and filtering capabilities
 */
export const FilterLayoutExample = () => (
  <TablePageWrapper
    layout="filter"
    title="Product Inventory"
    description="Search and filter products in your inventory"
    actions={
      <>
        <Button variant="outline">
          Export CSV
        </Button>
        <Button>
          Add Product
        </Button>
      </>
    }
    filters={
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Filter Products
            </h3>
            <p className="text-sm text-gray-600">
              Use the filters below to find specific products
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm">
              Apply Filters
            </Button>
            <Button variant="outline" size="sm">
              Clear All
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <Input placeholder="Product name..." />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="books">Books</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Price Range
            </label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Any Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-50">$0 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100+">$100+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    }
    table={<MockTable title="Filtered Product Table" />}
  />
);

/**
 * Example 3: Sidebar Layout
 * For pages that need additional navigation or information panel
 */
export const SidebarLayoutExample = () => (
  <TablePageWrapper
    layout="sidebar"
    title="Analytics Dashboard"
    description="View detailed analytics and reports"
    actions={
      <>
        <Button variant="outline">
          Download Report
        </Button>
        <Button>
          Create Report
        </Button>
      </>
    }
    sidebar={<MockSidebar />}
    table={<MockTable title="Analytics Table" />}
  />
);

/**
 * Example 4: Compact Layout
 * For pages with limited space or dense information
 */
export const CompactLayoutExample = () => (
  <TablePageWrapper
    layout="basic"
    compact={true}
    title="Quick View"
    description="Compact layout for dense information"
    actions={
      <Button size="sm">
        Action
      </Button>
    }
    table={<MockTable title="Compact Table" />}
  />
);

/**
 * Example 5: Legacy Support
 * Shows how existing implementations continue to work
 */
export const LegacyExample = () => (
  <TablePageWrapper
    title="Legacy Implementation"
    description="This works with existing code"
    actions={<Button>Legacy Action</Button>}
  >
    <MockTable title="Legacy Table Content" />
  </TablePageWrapper>
);

/**
 * Example 6: Custom Styling
 * Shows how to customize appearance
 */
export const CustomStyledExample = () => (
  <TablePageWrapper
    layout="basic"
    title="Custom Styled Page"
    description="Example with custom styling"
    actions={<Button>Custom Action</Button>}
    table={<MockTable title="Custom Table" />}
    className="max-w-6xl mx-auto"
    headerClassName="bg-gradient-to-r from-blue-50 to-indigo-50"
    contentClassName="border-2 border-blue-200"
  />
);

// Export all examples for documentation
export const AllExamples = {
  BasicLayoutExample,
  FilterLayoutExample,
  SidebarLayoutExample,
  CompactLayoutExample,
  LegacyExample,
  CustomStyledExample,
};