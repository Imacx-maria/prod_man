# Design Style Guide

This document outlines the design patterns, component usage, and styling conventions for our application. Follow these guidelines to ensure consistency across all pages.

## 📐 Layout Structure

### Main Container
All pages should use a consistent main container structure:

```tsx
<div className="w-full space-y-6">
  {/* Page content */}
</div>
```

**Alternative for contained layouts:**
```tsx
<div className="container mx-auto py-10">
  {/* Page content */}
</div>
```

### Page Headers
Use consistent header hierarchy:

```tsx
{/* Main page title */}
<h1 className="text-2xl font-bold">Page Title</h1>

{/* Section headers */}
<h2 className="mb-6 text-2xl font-bold">Section Title</h2>
<h2 className="mb-6 text-xl font-bold">Subsection Title</h2>
```

### Spacing
- Use `space-y-6` for main page sections
- Use `space-y-4` for form sections
- Use `gap-4` or `gap-2` for flex containers
- Use `mb-6` for section headers
- Use `mb-4` for subsection headers

## 🎨 Color System

### Status Indicators
Use consistent colors for status representation:

```tsx
// Priority/Status dots
const getPColor = (condition: boolean, warn = false) => 
  condition ? "bg-red-500" : warn ? "bg-[var(--blue-light)]" : "bg-green-500";

// Standard status colors
const statusColors = {
  success: "bg-green-600",
  warning: "bg-orange-500", 
  error: "bg-red-600",
  info: "bg-[var(--blue-light)]"
};
```

### Background Colors
- Use `bg-[var(--main)]` for primary backgrounds
- Use `bg-[var(--orange)]` for table headers
- Use `bg-background` for card/drawer content

### Hover Colors
Use consistent hover effects across interactive elements:

```tsx
// Table row hover
<TableRow className="hover:bg-[var(--main)]">
  {/* Row content */}
</TableRow>

// Button hover (handled by component variants)
<Button variant="default">Button</Button>

// Interactive card hover
<div className="hover:bg-[var(--main)] cursor-pointer">
  {/* Card content */}
</div>
```

**Hover Color Guidelines:**
- **Table rows:** Always use `hover:bg-[var(--main)]` for consistent row highlighting
- **Interactive elements:** Use `hover:bg-[var(--main)]` for clickable cards, list items, etc.
- **Never use orange hover:** Avoid `hover:bg-[var(--orange)]` as orange is reserved for headers and accent elements
- **Buttons:** Let component variants handle hover states automatically

## 📋 Table Design Patterns

### Standard Table Structure (with 2px Outside Border)
**CRITICAL: TABLES ARE FULL-WIDTH, ONLY AÇÕES COLUMN IS OPTIMIZED FOR BUTTON SPACING!**

```tsx
<div className="rounded-none bg-background w-full border-2 border-border">
  <div className="w-full rounded-none">
    <Table className="w-full border-0 rounded-none [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border font-bold uppercase">
            Data Column (flexible width)
          </TableHead>
          {/* ...other headers... */}
          <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[90px] font-bold uppercase text-center">
            Ações
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Table content */}
      </TableBody>
    </Table>
  </div>
</div>
```

**Key Table Structure Requirements:**
- **TABLES ARE FULL-WIDTH**: Always use `w-full` on table containers, wrappers, and Table element
- **AÇÕES Column Optimization**: Only the AÇÕES column gets specific width constraints to minimize white space after buttons
- Always use `border-2 border-border` and `rounded-none` on the outer table container for a 2px border and sharp corners.
- Add `rounded-none` to all scroll wrappers and the `<Table>` element to guarantee sharp corners.
- Use `border-b-2 border-border` on all `<TableHead>` for a 2px header outline.
- Set `border-0` on the `<Table>` to avoid double borders.
- Do not add additional borders to `<TableRow>` or `<TableCell>` unless needed for row/column separation.
- **CRITICAL:** Remove all height constraints (`max-h-[70vh]`, `overflow-y-auto`) from table containers to allow natural page scrolling
- **Table Padding**: Use CSS selectors `[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2` on Table element for consistent padding
- **Note:** Always check for and override any default or inherited `border-radius` on table, wrapper, or parent elements to ensure perfectly sharp corners.

### AÇÕES Column Requirements (CRITICAL FIX)

**Problem:** AÇÕES columns show excessive white space after action buttons within the column.

**MANDATORY Solution Pattern (NEVER FORGET THIS!):**
```tsx
{/* STEP 1: Tables are FULL-WIDTH, only AÇÕES column is constrained */}
<div className="rounded-none bg-background w-full border-2 border-border">
  <div className="w-full rounded-none">
    <Table className="w-full border-0 rounded-none [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
      
      {/* STEP 2: Main content column(s) - flexible width */}
      <TableHead className="font-bold uppercase">
        CONTENT COLUMN
      </TableHead>
      
      {/* STEP 3: AÇÕES column width based on button count */}
      {/* For 2 buttons: w-[90px] */}
      <TableHead className="w-[90px] font-bold uppercase text-center">
        AÇÕES
      </TableHead>
      
      {/* For 3 buttons: w-[140px] */}
      <TableHead className="w-[140px] font-bold uppercase text-center">
        AÇÕES
      </TableHead>
      
      {/* STEP 4: Action buttons MUST be perfect squares, cell uses flex */}
      <TableCell className="flex gap-2 justify-center">
        <Button 
          variant="default" 
          size="icon" 
          className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button 
          variant="destructive" 
          size="icon" 
          className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </Table>
  </div>
</div>
```

**AÇÕES Column Standards (MANDATORY - NEVER FORGET!):**
- **CRITICAL: Tables are FULL-WIDTH** - Use `w-full` on all table containers
- **AÇÕES Column Optimization**: Only the AÇÕES column gets width constraints to minimize button white space
- **Always center-aligned**: Use `text-center` on AÇÕES headers
- **Width by button count**: 
  - 2 buttons: `w-[90px]` (tighter spacing)
  - 3 buttons: `w-[140px]`
  - 4+ buttons: `w-[180px]`
- **Button spacing**: Use `flex gap-2 justify-center` directly on TableCell
- **Perfect square buttons**: All action buttons MUST use `!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square`

**CHECKLIST FOR EVERY TABLE:**
- [ ] Container: `w-full` (tables are full-width)
- [ ] Wrapper: `w-full` (tables are full-width) 
- [ ] Table: `w-full` (tables are full-width)
- [ ] AÇÕES header: `text-center` and appropriate width constraint
- [ ] Action buttons: Perfect square className
- [ ] Action cells: `flex gap-2 justify-center` (no wrapper div)

### Table Height Policy: Natural Scrolling

**❌ Wrong - Constrained Table Height:**
```tsx
<div className="max-h-[70vh] overflow-y-auto w-full">
  <Table>...</Table>
</div>
```

**✅ Correct - Natural Table Height:**
```tsx
<div className="w-full rounded-none">
  <Table>...</Table>
</div>
```

**Why Remove Height Constraints:**
- Tables should expand to show all content naturally without artificial height limits
- Users should scroll the entire page naturally rather than within small constrained areas
- Better UX when there's plenty of screen space available
- Eliminates confusing dual scroll bars (page scroll + table scroll)
- Allows tables to utilize full available space efficiently

**When to Apply This Fix:**
- Remove `max-h-[70vh]`, `max-h-[40vh]`, or any other height constraints from table containers
- Remove `overflow-y-auto` from table wrapper divs
- Keep only `w-full rounded-none` for the scroll wrapper container
- Apply this pattern to ALL tables across the application for consistency

### Column Width Patterns
```tsx
// Fixed widths for specific content types
<TableHead className="w-[90px]">Date</TableHead>
<TableHead className="w-[90px]">FO</TableHead>
<TableHead className="w-[90px]">Guia</TableHead>
<TableHead className="w-[90px]">ORC</TableHead>
<TableHead className="w-[60px]">ID</TableHead>
<TableHead className="w-[140px]">Select</TableHead>
<TableHead className="w-[180px]">Status</TableHead>
<TableHead className="w-[36px] text-center">Icon</TableHead>

// Flexible content
<TableHead className="min-w-[200px]">Description</TableHead>
<TableHead className="flex-1">Long Content</TableHead>
```

### Standard Column Widths
- **FO columns:** Always use `w-[90px]` (90px width)
- **Guia columns:** Always use `w-[90px]` (90px width)  
- **ORC columns:** Always use `w-[90px]` (90px width)
- **Date picker columns:** Always use `w-[160px]` (160px width) for consistent date field sizing

### Column Header Alignment
- **Center-aligned headers:** Use `text-center` for:
  - **Actions columns (AÇÕES)** - always center-aligned to align with action button pairs
  - Button columns (Notes, Actions) 
  - Checkbox columns (Brindes, Concluído, Saiu)
  - Radio button columns (Source selection)
  - **Numeric ID columns (FO, ORC, Guia)** - headers are center-aligned, row content is right-aligned
- **Left-aligned headers:** All other columns use default left alignment  
  - Text columns (Cliente, Item, Transportadora)
  - Other numeric columns (Quantidade) - headers are left-aligned, row content is right-aligned
  
**Important:** For numeric ID columns like FO, ORC, and Guia:
- **Header alignment**: Center-aligned using `text-center`
- **Content alignment**: Right-aligned using `text-right` on table cells for easy comparison

### Header Implementation Pattern
For proper alignment, both the header class AND the inner div justification must match:

```tsx
// Center-aligned headers (buttons/checkboxes/numeric IDs)
<TableHead className="text-center">
  <div className="flex items-center justify-center">
    {/* Header content for buttons, checkboxes, FO, ORC, Guia */}
  </div>
</TableHead>

// Left-aligned headers (text/other numeric)  
<TableHead className="">
  <div className="flex items-center justify-between">
    {/* Header content for text columns, Quantidade, etc. */}
  </div>
</TableHead>
```

**Critical:** Never use `justify-between` with center-aligned headers as it will override the centering.

### Sortable Headers
Always implement sorting for data tables:

```tsx
const handleSort = (column: string) => {
  if (sortColumn === column) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};
```

### Sortable Headers Requirement

- **All data tables must implement sortable headers.**
- Clicking a header should toggle the sort direction (ascending/descending) for that column.
- Use visual indicators (such as up/down arrows) to show the current sort direction.
- Example pattern:

```tsx
<TableHead
  className="cursor-pointer select-none"
  onClick={() => handleSort('field')}
>
  Column Header
  {sortColumn === 'field' && (
    sortDirection === 'asc'
      ? <ArrowUp className="inline w-3 h-3 ml-1" />
      : <ArrowDown className="inline w-3 h-3 ml-1" />
  )}
</TableHead>
```

- The sorting logic should update both the sort column and direction in state.

## 📑 Full-Width Tabs with Tables

For pages that need to display the same table with different filtered data sets, use the full-width tabs pattern:

### Standard Full-Width Tabs Structure
```tsx
<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="tab1">
      Tab Label ({activeTab === 'tab1' ? data.length : '...'})
    </TabsTrigger>
    <TabsTrigger value="tab2">
      Tab Label ({activeTab === 'tab2' ? data.length : '...'})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1">
    {/* Identical table structure for tab 1 */}
    <div className="rounded-none bg-background w-full border-2 border-border">
      {/* Table content */}
    </div>
  </TabsContent>
  
  <TabsContent value="tab2">
    {/* Identical table structure for tab 2 */}
    <div className="rounded-none bg-background w-full border-2 border-border">
      {/* Table content */}
    </div>
  </TabsContent>
</Tabs>
```

### Key Requirements for Full-Width Tabs:

**Container Setup:**
- Always use `className="w-full"` on the `<Tabs>` component to ensure full page width
- Use `className="grid w-full grid-cols-2"` on `<TabsList>` for equal-width tab buttons
- For more than 2 tabs, adjust grid-cols accordingly: `grid-cols-3`, `grid-cols-4`, etc.

**Dynamic Count Display:**
- Show real-time counts in tab labels: `Tab Name ({count})`
- Use conditional rendering for accurate counts: `{activeTab === 'current' ? actualData.length : '...'}`
- Display loading state (`...`) for inactive tabs to avoid unnecessary computation

**Content Structure:**
- Each `<TabsContent>` should contain identical table structures
- Only the underlying data should differ between tabs (filtering, completion status, etc.)
- Maintain the same columns, functionality, and styling across all tabs
- Include the same action buttons, filters, and interactive elements in each tab

**Tab State Management:**
- Use state to track active tab: `const [activeTab, setActiveTab] = useState('default_tab')`
- Update data queries/filters when tab changes
- Preserve user interactions (sorting, pagination) within each tab context

### Example with Multiple Tabs:
```tsx
{/* For 3+ tabs */}
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
  <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
  <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
</TabsList>
```

### When to Use Full-Width Tabs:
- **Data Filtering:** When showing the same table structure with different filtered datasets
- **Status Views:** Displaying items by completion status, priority, or category
- **Time-based Views:** Current vs. historical data with identical functionality
- **User Roles:** Different data access levels using the same table interface

### Benefits of This Pattern:
- **Consistent UX:** Users see familiar table layouts across different data views
- **Space Efficiency:** Tabs utilize full page width for maximum data visibility
- **Clear Navigation:** Equal-width tabs provide balanced visual hierarchy
- **Real-time Feedback:** Dynamic counts show data volumes at a glance

**Important:** Avoid using this pattern for functionally different tables or when tabs contain significantly different content types. Reserve it for cases where the table structure and functionality remain identical across tabs.

## 📑 Drawer Tabs with Tables

For drawers that need to display multiple related content areas (such as production data and logistics data for the same entity), use the drawer tabs pattern:

### Standard Drawer Tabs Structure
```tsx
<Drawer open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
  <DrawerContent className="h-[98vh] min-h-[98vh] max-h-[98vh] !top-0 overflow-y-auto">
    <DrawerHeader className="sr-only">
      <DrawerTitle>Entity Details</DrawerTitle>
      <DrawerDescription>Detailed view description</DrawerDescription>
    </DrawerHeader>
    
    <div className="p-6 space-y-6 relative">
      {/* Close button */}
      <Button size="icon" variant="outline" onClick={onClose} className="absolute top-6 right-6 z-10">
        <X className="w-4 h-4" />
      </Button>
      
      {/* Entity info header */}
      <div className="mb-6 p-4 uppercase">
        {/* Entity details */}
      </div>
      
      {/* Tabs below entity info */}
      <Tabs defaultValue="tab1" className="w-full pl-4">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1 Name</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2 Name</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tab1">
          <div className="mt-6">
            {/* Tab 1 content with table */}
            <div className="flex justify-between items-start mb-6">
              <div className="p-0">
                <h2 className="text-lg font-semibold">Tab 1 Title</h2>
                <p className="text-sm text-muted-foreground">Tab 1 description</p>
              </div>
              <div className="flex gap-2 items-center">
                {/* Tab-specific action buttons */}
              </div>
            </div>
            
            {/* Tab 1 table */}
            <div className="rounded-none bg-background w-full border-2 border-border mt-6">
              <div className="max-h-[40vh] overflow-y-auto w-full">
                <Table className="w-full border-0">
                  {/* Table content */}
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tab2">
          <div className="mt-6">
                       {/* Tab 2 content with different table */}
           <div className="flex justify-between items-start mb-6">
             <div className="p-0">
               <h2 className="text-xl font-bold">Tab 2 Title</h2>
               <p className="text-sm text-muted-foreground">Tab 2 description</p>
             </div>
             <div className="flex gap-2 items-center">
               {/* Tab-specific action buttons */}
             </div>
           </div>
           
           {/* Logistics table with custom component and hidden columns */}
           <div className="rounded-none bg-background w-full border-2 border-border mt-6">
             <div className="max-h-[70vh] overflow-y-auto w-full">
               <div className="[&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden">
                 <LogisticaTableWithCreatable
                    records={logisticaRows}
                    clientes={logisticaClientes || []}
                    transportadoras={logisticaTransportadoras || []}
                    armazens={logisticaArmazens || []}
                    hideColumns={['cliente']}
                    showSourceSelection={true}
                    sourceRowId={sourceRowId}
                    onSourceRowChange={setSourceRowId}
                    {/* Multiple callback props for handling data updates */}
                    onItemSave={handleItemSave}
                    onConcluidoSave={handleConcluidoSave}
                    onQuantidadeSave={handleQuantidadeSave}
                    onNotasSave={handleNotasSave}
                    onDeleteRow={handleDeleteRow}
                    /* ... other callback props ... */
                    tableDate={entityIdentifier}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </DrawerContent>
</Drawer>
```

### Key Requirements for Drawer Tabs:

**Container Setup:**
- Use `className="w-full pl-4"` on the `<Tabs>` component for proper spacing within drawer
- Use standard `<TabsList>` without grid layout (unlike full-width tabs)
- Place tabs after entity information header but before main content

**Drawer Layout:**
- Always include `className="p-6 space-y-6 relative"` on main drawer container
- Position close button absolutely: `className="absolute top-6 right-6 z-10"`
- Use `className="sr-only"` on `DrawerHeader` for accessibility when content is self-descriptive

**Tab Content Structure:**
- Each tab should have its own header section with title, description, and action buttons
- Use consistent spacing: `className="mt-6"` for tab content
- Include tab-specific action buttons (Add, Refresh, etc.) in the header area

**Table Variations:**
- **Production tables:** Use `max-h-[40vh]` for smaller, focused tables
- **Logistics tables:** Use `max-h-[70vh]` for larger, data-heavy tables
- **Sharp corners:** Always use `rounded-none` for both production and logistics tables
- **Border handling:** Use `border-2 border-border` for both production and logistics tables for consistent thick borders

### Tab-Specific Patterns:

**Production Tab:**
```tsx
<TabsContent value="producao">
  <div className="mt-6">
    <div className="flex justify-between items-start mb-6">
      <div className="p-0">
        <h2 className="text-lg font-semibold">Production Title</h2>
        <p className="text-sm text-muted-foreground">Production description</p>
      </div>
      <div className="flex gap-2 items-center">
        <Button size="sm">Add Item</Button>
        <Button size="sm" variant="outline">Refresh</Button>
        <SimpleNotasPopover className="h-9 w-9" />
      </div>
    </div>
    
    {/* Production table with sharp corners and 40vh height */}
    <div className="rounded-none bg-background w-full border-2 border-border mt-6">
      <div className="max-h-[40vh] overflow-y-auto w-full">
        <Table className="w-full border-0">
          {/* Production-specific columns and functionality */}
        </Table>
      </div>
    </div>
  </div>
</TabsContent>
```

**Logistics Tab:**
```tsx
<TabsContent value="logistica">
  <div className="mt-6">
    <div className="flex justify-between items-start mb-6">
      <div className="p-0">
        <h2 className="text-xl font-bold">Logistics Title</h2>
        <p className="text-sm text-muted-foreground">Logistics description</p>
      </div>
      <div className="flex gap-2 items-center">
        <Button size="sm">Add Item</Button>
        <Button size="sm" variant="secondary">Copy Quantities</Button>
        <Button size="sm" variant="outline">Refresh</Button>
        <Button size="sm" variant="default">Copy Delivery</Button>
      </div>
    </div>
    
         {/* Logistics table with custom component and hidden columns */}
     <div className="rounded-none bg-background w-full border-2 border-border mt-6">
       <div className="max-h-[70vh] overflow-y-auto w-full">
         <div className="[&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden">
           <LogisticaTableWithCreatable
             records={logisticaRows}
             clientes={logisticaClientes || []}
             transportadoras={logisticaTransportadoras || []}
             armazens={logisticaArmazens || []}
             hideColumns={['cliente']}
             showSourceSelection={true}
             sourceRowId={sourceRowId}
             onSourceRowChange={setSourceRowId}
             {/* Multiple callback props for handling data updates */}
             onItemSave={handleItemSave}
             onConcluidoSave={handleConcluidoSave}
             onQuantidadeSave={handleQuantidadeSave}
             onNotasSave={handleNotasSave}
             onDeleteRow={handleDeleteRow}
             /* ... other callback props ... */
             tableDate={entityIdentifier}
           />
         </div>
       </div>
     </div>
  </div>
</TabsContent>
```

### Logistics Table Requirements:

The logistics tab uses a specialized table component with specific requirements:

**Custom Component Usage:**
- Use `LogisticaTableWithCreatable` instead of standard `<Table>` component
- This component handles complex logistics data with multiple related entities
- Supports inline editing, row duplication, and source row selection

**Hidden Columns Pattern:**
```tsx
<div className="[&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden [&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden">
  <LogisticaTableWithCreatable />
</div>
```
- Use CSS selector syntax to hide specific columns by position
- Pattern: `[&_th:nth-child(N)]:hidden [&_td:nth-child(N)]:hidden` where N is column number
- Typically used to hide client-related columns that are redundant in single-entity context

**Required Props:**
- `records`: Array of logistics data
- `clientes`, `transportadoras`, `armazens`: Reference data arrays
- `hideColumns`: Array of column names to hide programmatically
- `showSourceSelection`: Boolean to enable source row selection
- `sourceRowId` & `onSourceRowChange`: For managing source row state
- `tableDate`: Entity identifier for context

**Callback Props Pattern:**
- Multiple `onXxxSave` callbacks for different field types
- `onDeleteRow` for row deletion
- `onDuplicateRow` for creating copies
- Each callback handles optimistic updates and database persistence

**Container Styling:**
- Use `rounded-none` and `border-2 border-border` (same as production tables for consistent thick borders)
- Use `max-h-[70vh]` for larger data capacity
- LogisticaTableWithCreatable component now has internal wrapper with thick borders
- Container in production page provides scroll area, component provides borders

**Internal Cell Styling (NO OUTLINES):**
- **Input fields**: Use `className="border-0 outline-0 focus:ring-0 focus:border-0 h-8 text-sm"` for borderless inputs
- **Number fields**: Add `text-right` to input class for right alignment
- **Read-only cells** (ORC/FO): Use `bg-muted/20 text-right font-mono` background styling
- **DatePicker**: Use `buttonClassName="w-full h-10 border-0 outline-0 focus:ring-0 focus:border-0"` for borderless buttons
- **Comboboxes**: Follow their own internal styling (CreatableCombobox components handle styling internally)
- **Critical**: NO borders, NO outlines, NO focus rings on any input elements within logistics tables

### When to Use Logistics Tables:
- Complex multi-entity data relationships
- Need for inline editing across multiple related fields
- Source/template row functionality required
- Column visibility needs to be contextually controlled

## 📏 Table Component Consistency Requirements

All tables across the application must maintain visual consistency in interactive elements:

### Height Standardization
- **All inputs within tables:** Must use `h-10` (40px height)
- **All buttons within tables:** Must use default `h-10` from Button component
- **All comboboxes within tables:** Automatically use `h-10` from Button component
- **All date pickers within tables:** Must specify `buttonClassName="w-full h-10"`
- **Text areas for wrappable content:** Must use `min-h-[40px]` with `rows={2}`

### Item Field Wrapping
- **Item/Description columns:** Must use `Textarea` component instead of `Input` for multi-line content
- **Configuration:** Use `rows={2}`, `resize-none`, and `min-h-[40px]`
- **Purpose:** Allows long item descriptions to wrap properly without breaking table layout

### Table Input Styling (No Visual Borders)
All inputs within table cells must use borderless styling:
```tsx
className="border-0 outline-0 focus:ring-0 focus:border-0 h-10 text-sm"
```

### Table Padding Consistency (Critical Fix)
**CRITICAL:** All tables must use this exact structure to fix padding/margin issues:

#### Standard Table Container Structure:
```tsx
<div className="rounded-none bg-background w-full border-2 border-border">
  <div className="max-h-[70vh] overflow-y-auto w-full">
    <Table className="w-full table-fixed border-0 uppercase">
      {/* Headers and content */}
    </Table>
  </div>
</div>
```

#### Table Cell Padding (Apply to Table element):
```tsx
<Table className="w-full table-fixed border-0 uppercase [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
```

**Key Requirements:**
- **Container**: Must have `border-2 border-border` for 2px outer border
- **Table**: Must have `border-0` to prevent double borders
- **Padding**: Use `[&_td]:px-3 [&_td]:py-2` for consistent 12px horizontal, 8px vertical padding
- **Headers**: Use `[&_th]:px-3 [&_th]:py-2` for matching header padding
- **No Individual Padding**: NEVER add `p-*` classes to individual TableCell elements
- **AÇÕES Column Exception**: Action button cells should NOT use the global padding and must use `flex gap-2 justify-center` for proper button alignment

#### Checkbox/Button Column Alignment:
```tsx
// Header
<TableHead className="w-12 text-center bg-[var(--orange)] font-bold">
  Checkbox Header
</TableHead>

// Cell
<TableCell className="text-center">
  <div className="flex items-center justify-center">
    <Checkbox />
  </div>
</TableCell>
```

#### DatePicker Column Proper Sizing:
```tsx
// Header - give adequate width
<TableHead className="w-44 bg-[var(--orange)] font-bold">
  Data
</TableHead>

// Cell - use constrained button
<TableCell>
  <DatePicker
    buttonClassName="w-full h-10 max-w-[160px]"
    selected={date}
    onSelect={handleDateChange}
  />
</TableCell>
<Table className="w-full table-fixed border-0 uppercase [&_td:first-child]:pl-2 [&_td:last-child]:pr-2 [&_td]:px-2 [&_td]:py-2">
```

**TableCell Elements:** Remove individual padding classes:
```tsx
{/* ❌ Wrong - creates inconsistent spacing */}
<TableCell className="p-2 text-sm">

{/* ✅ Correct - let table handle padding */}
<TableCell className="text-sm">
```

#### AÇÕES Column Spacing Fix:
**Problem:** Action buttons in the last column appear too close to the right table border
**Solution:** Use the correct AÇÕES column pattern to ensure proper spacing:

```tsx
{/* ✅ Correct AÇÕES Header */}
<TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[100px] font-bold uppercase text-center">
  Ações
</TableHead>

{/* ✅ Correct AÇÕES Cell with proper spacing */}
<TableCell className="flex gap-2 justify-center">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="default" size="icon" className="h-10 w-10 rounded-none">
          <Eye className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Ver</TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="destructive" size="icon" className="h-10 w-10 rounded-none">
          <Trash2 className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Eliminar</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

**Critical Requirements for AÇÕES Column:**
- **Header**: Always use `w-[100px]` width and `text-center` alignment
- **Cell**: Use `flex gap-2 justify-center` to center buttons with proper spacing
- **Buttons**: Use `h-10 w-10 rounded-none` for square, sharp-cornered buttons
- **Spacing**: The `gap-2` provides 8px spacing between buttons
- **NO padding classes**: Action cells should NOT have `px-*` classes that interfere with button alignment

**CSS Selector Explanation:**
- `[&_td:first-child]:pl-2` - Left padding only on first column
- `[&_td:last-child]:pr-2` - Right padding only on last column  
- `[&_td]:px-2` - Horizontal padding on all columns
- `[&_td]:py-2` - Vertical padding on all columns

This approach ensures:
- **Consistent spacing** between content and table borders
- **No extra padding** on the last column that creates unwanted space
- **Uniform padding** across all table cells
- **Responsive behavior** that works with different table structures
- **Proper button alignment** in AÇÕES columns using flexbox centering

### Component Import Requirements
For tables with wrappable content, ensure these imports:
```tsx
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
```

### Example Implementation
```tsx
{/* Standard table input - single line */}
<TableCell className="p-2 text-sm">
  <Input
    className="border-0 outline-0 focus:ring-0 focus:border-0 h-10 text-sm"
    value={row.field}
    onChange={handleChange}
  />
</TableCell>

{/* Item field - wrappable */}
<TableCell className="p-2 text-sm">
  <Textarea
    className="border-0 outline-0 focus:ring-0 focus:border-0 min-h-[40px] resize-none text-sm"
    value={row.description}
    onChange={handleChange}
    rows={2}
  />
</TableCell>

{/* Numeric input - right aligned */}
<TableCell className="p-2 text-sm">
  <Input
    type="text"
    className="border-0 outline-0 focus:ring-0 focus:border-0 h-10 text-sm text-right"
    value={row.quantity}
    onChange={handleChange}
  />
</TableCell>
```

### Consistency Checklist for Tables
- [ ] All inputs use `h-10` height
- [ ] All buttons use default `h-10` height
- [ ] Item/description fields use `Textarea` with wrapping capability
- [ ] Date pickers specify `buttonClassName="w-full h-10"`
- [ ] All table inputs use borderless styling
- [ ] Numeric fields are right-aligned
- [ ] Visual alignment is consistent across all interactive elements

### When to Use Drawer Tabs:
- **Related Data Views:** Different aspects of the same entity (production vs. logistics)
- **Workflow Stages:** Sequential steps in a process
- **Data Types:** Different data structures that relate to the same parent entity
- **Space Efficiency:** When drawer content would be too long for a single scroll

### Benefits of Drawer Tabs:
- **Organized Content:** Logical separation of related functionality
- **Reduced Complexity:** Breaks down complex entities into manageable sections
- **Context Preservation:** Maintains parent entity context across different views
- **Efficient Space Usage:** Maximizes drawer real estate without overwhelming users

**Important:** Unlike full-width tabs, drawer tabs should contain functionally different content types. Each tab typically represents a different aspect or workflow stage for the same entity, rather than the same data with different filters.

## 🔧 Filter Bar Patterns

### Standard Filter Layout
```tsx
<div className="flex items-center gap-2">
  {/* Filters */}
  <Input placeholder="Filter Field" className="w-[120px]" />
  <Input placeholder="Filter Description" className="flex-1" />
  
  {/* Action buttons */}
  <Button variant="outline" size="icon" onClick={clearFilters}>
    <X className="w-4 h-4" />
  </Button>
  
  <Button variant="default" size="icon">
    <Plus className="w-4 h-4" />
  </Button>
</div>
```

### Filter Input Sizes
- Short IDs: `w-[120px]`
- Medium fields: `w-[140px]` 
- Codes: `w-[140px]`
- Descriptions: `flex-1`
- Client selects: `w-[200px]`

## 🎯 Interactive Elements

### Inline Editing Pattern

For tables that support inline editing (editing fields directly in the table without opening a drawer), use this pattern:

#### Inline Edit Button (Edit Icon)
```tsx
{/* Inline edit button - makes row fields editable */}
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="default"
        size="icon"
        onClick={() => {
          setEditingId(item.id);
          setEditField1(item.field1);
          setEditField2(item.field2);
          // Set initial values for all editable fields
        }}
        disabled={editingId !== null}
      >
        <Edit className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Editar</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Inline Editing State Management
```tsx
const [editingId, setEditingId] = useState<string | null>(null)
const [editField1, setEditField1] = useState('')
const [editField2, setEditField2] = useState<Date | undefined>(undefined)
```

#### Inline Editable Fields with Save/Cancel
```tsx
{/* Example: Text field with save/cancel buttons */}
{editingId === item.id ? (
  <div className="flex gap-2 items-center">
    <Input
      value={editField1}
      onChange={(e) => setEditField1(e.target.value)}
      className="rounded-none flex-1"
      placeholder="Field placeholder"
    />
    <div className="flex gap-1">
      {/* Save button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              onClick={handleSave}
              disabled={!editField1.trim() || submitting}
            >
              <span className="text-xs">✓</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Guardar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {/* Cancel button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancelar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
) : (
  item.field1
)}

{/* Example: DatePicker field for inline editing */}
{editingId === item.id ? (
  <DatePicker
    selected={editField2}
    onSelect={(date) => setEditField2(date)}
    buttonClassName="w-full h-10 border-0 outline-0 focus:ring-0 focus:border-0 rounded-none"
  />
) : (
  formatDisplayDate(item.field2)
)}
```

#### Complete Save Handler Example
```tsx
const handleSave = async () => {
  if (!editField1.trim()) return;
  
  setSubmitting(true);
  try {
    const updates = {
      field1: editField1.trim(),
      field2: editField2 ? editField2.toISOString().split('T')[0] : item.field2,
      updated_at: new Date().toISOString().split('T')[0]
    };
    
    const { error } = await supabase
      .from('table')
      .update(updates)
      .eq('id', item.id);
    
    if (!error) {
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, ...updates } : i
      ));
    }
  } catch (error) {
    console.error('Error updating:', error);
  } finally {
    setSubmitting(false);
    setEditingId(null);
    setEditField1('');
    setEditField2(undefined);
  }
};
```

### Button Patterns

#### Icon Buttons - Must Be Perfect SQUARES
All icon buttons must use this exact pattern to ensure they are truly square (not rectangular):

```tsx
{/* CRITICAL: All icon buttons must use this exact className pattern */}
<Button 
  variant="default" 
  size="icon" 
  className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square"
>
  <Plus className="w-4 h-4" />
</Button>

{/* Action buttons in AÇÕES columns - PERFECT SQUARES */}
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="default" 
        size="icon" 
        className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square"
      >
        <Eye className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Ver</TooltipContent>
  </Tooltip>
</TooltipProvider>

{/* Header buttons - PERFECT SQUARES */}
<Button 
  variant="outline" 
  size="icon" 
  className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square"
>
  <RotateCw className="w-4 h-4" />
</Button>
```

#### Export to Excel Buttons - Standard Pattern
```tsx
{/* Excel export button - always use Download icon with default variant */}
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="default" 
        size="icon" 
        className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square"
        onClick={exportToExcel}
        disabled={data.length === 0}
      >
        <Download className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Exportar para Excel</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Text Buttons - Sharp Corners Only
```tsx
{/* Icon with text - use default height, no width constraint, SHARP CORNERS */}
<Button variant="default" className="h-10 rounded-none gap-2">
  <Plus className="w-4 h-4" /> Add Item
</Button>

{/* Form buttons - SHARP CORNERS */}
<Button type="submit" variant="default" className="h-10 rounded-none">
  Save
</Button>
<Button type="button" variant="outline" className="h-10 rounded-none">
  Cancel
</Button>
```

### Icon-Only Button Tooltip Pattern

- **All icon-only buttons (buttons without text) must always be wrapped in a Tooltip with a clear, descriptive label.**
- This applies to:
  - Add / Adicionar buttons (just the "+" sign)
  - Copiar (just the icon, except for Copiar Entrega on produção/logistica tab)
  - Refresh
  - Any other icon-only action buttons
- The Tooltip should use a concise, user-friendly label (e.g., "Adicionar", "Copiar", "Atualizar").
- See `designer-flow/page.tsx` for a good implementation example.

#### Example: Add Button
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="default" size="icon" aria-label="Adicionar">
        <Plus className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Adicionar</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Example: Copiar Button
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="icon" aria-label="Copiar">
        <Copy className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Copiar</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Example: Refresh Button
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="icon" aria-label="Atualizar">
        <RotateCw className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Atualizar</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Example: Export to Excel Button
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="default" size="icon" aria-label="Exportar para Excel">
        <Download className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Exportar para Excel</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Notes Button Pattern
The notes button must follow these exact specifications for consistency across all tables:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div>
        <SimpleNotasPopover
          value={row.notas ?? ''}
          onSave={async (newNotas) => {
            await supabase.from('table').update({ notas: newNotas }).eq('id', row.id);
            setItems(prev => prev.map(item => 
              item.id === row.id ? { ...item, notas: newNotas } : item
            ));
          }}
          placeholder="Adicionar notas..."
          label="Notas"
          buttonSize="icon"
          className="mx-auto aspect-square"
          disabled={false}
        />
      </div>
    </TooltipTrigger>
    {row.notas && row.notas.trim() !== '' && (
      <TooltipContent>
        {row.notas}
      </TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

**Key Requirements:**
- **Icon:** Always uses `FileText` icon (handled by SimpleNotasPopover)
- **Button Variants:** 
  - `variant="link"` when notes exist (has content)
  - `variant="ghost"` when notes are empty
- **Mandatory Tooltip:** Must show tooltip with notes content on hover when notes exist
- **Conditional Tooltip:** Only show tooltip when `row.notas` exists and is not empty after trimming
- **Styling:** Use `className="mx-auto aspect-square"` for consistent button appearance
- **Size:** Always use `buttonSize="icon"`

**For complex notes with multiple fields (logistics tables):**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div>
        <NotasPopover
          value={row.notas || ''}
          contacto_entrega={row.contacto_entrega || ''}
          telefone_entrega={row.telefone_entrega || ''}
          data={row.data || tableDate}
          onChange={(value) => handleEdit(row.id, 'notas', value)}
          onSave={async (fields) => {
            await onNotasSave(row, fields.outras, undefined, undefined,
                            fields.contacto_entrega, fields.telefone_entrega, fields.data);
          }}
          iconType="file"
          buttonSize="icon"
          className="mx-auto aspect-square"
          centered={true}
        />
      </div>
    </TooltipTrigger>
    {row.notas && row.notas.trim() !== '' && (
      <TooltipContent>
        {row.notas}
      </TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

**Important Notes:**
- The tooltip functionality is **mandatory** for all notes buttons
- Always wrap the notes component with `TooltipProvider`, `Tooltip`, and `TooltipTrigger`
- Use `asChild` prop on `TooltipTrigger` to make the entire button act as the trigger
- Conditional rendering: only show `TooltipContent` when notes actually exist
- The tooltip shows the full content of the notes field without truncation

### Status Checkboxes
```tsx
<Checkbox
  checked={!!item.status}
  onCheckedChange={async (checked) => {
    const value = checked === 'indeterminate' ? false : checked;
    // Update local state
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, status: value } : i
    ));
    // Persist to database
    await supabase.from('table').update({ status: value }).eq('id', item.id);
  }}
/>
```

### Progress Indicators
```tsx
<div className="flex items-center gap-2">
  <Progress value={percentage} className="w-full" />
  <span className="text-xs font-mono w-10 text-right">{percentage}%</span>
</div>
```

## 🗂️ Drawer/Modal Patterns

### Drawer Content Structure & Spacing

All drawers should follow consistent structure patterns for headers, entity information, and content spacing:

#### Pattern 1: Form Drawers (Settings/CRUD)
For forms, settings pages, and simple CRUD operations:

```tsx
<Drawer open={openDrawer} onOpenChange={(open) => !open && resetForm()}>
  <DrawerContent className="h-screen min-h-screen !top-0 !mt-0 rounded-none">
    <div className="w-full px-4 md:px-8 flex flex-col h-full">
      <DrawerHeader className="flex-none">
        <div className="flex justify-end items-center gap-2 mb-2">
          <DrawerClose asChild>
            <Button variant="outline" size="sm" aria-label="Fechar">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </div>
        <DrawerTitle>
          {editing ? 'Editar Item' : 'Novo Item'}
        </DrawerTitle>
        <DrawerDescription>
          {editing 
            ? 'Edite as informações do item abaixo.'
            : 'Preencha as informações para criar um novo item.'
          }
        </DrawerDescription>
      </DrawerHeader>
      
      <div className="flex-grow overflow-y-auto">
        {/* Form content */}
      </div>
    </div>
  </DrawerContent>
</Drawer>
```

#### Pattern 2: Entity Detail Drawers (Production/Logistics)
For complex entity details with tabs and data tables:

```tsx
<Drawer open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
  <DrawerContent className="h-[98vh] min-h-[98vh] max-h-[98vh] !top-0 overflow-y-auto">
    <DrawerHeader className="sr-only">
      <DrawerTitle>Entity Details</DrawerTitle>
      <DrawerDescription>Detailed view description</DrawerDescription>
    </DrawerHeader>
    
    <div className="p-6 space-y-6 relative">
      {/* Close button - top right */}
      <Button size="icon" variant="outline" onClick={onClose} className="absolute top-6 right-6 z-10">
        <X className="w-4 h-4" />
      </Button>
      
      {/* Entity info header */}
      <div className="mb-6 p-4 uppercase">
        <div className="flex gap-8 items-center mb-2">
          <div>
            <div className="text-xs font-bold">Field Label</div>
            <div className="font-mono">{fieldValue}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold">Long Field</div>
            <div className="font-mono truncate">{longFieldValue}</div>
          </div>
        </div>
      </div>
      
      {/* Content with tabs or tables */}
      <Tabs defaultValue="tab1" className="w-full pl-4">
        {/* Tab content */}
      </Tabs>
    </div>
  </DrawerContent>
</Drawer>
```

#### Pattern 3: Full-Screen Modal Drawers (Complex Operations)
For specialized operations with toolbars and action buttons:

```tsx
<Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
  <DrawerContent className="overflow-hidden h-screen min-h-screen !top-0 !mt-0 max-w-[95vw] mx-auto bg-background p-0 border border-border shadow-md">
    <DrawerHeader>
      <DrawerTitle className="text-xl font-bold">Operation Title</DrawerTitle>
      <DrawerDescription>
        Operation description and context.
      </DrawerDescription>
      
      {/* Toolbar section */}
      <div className="flex items-center gap-2 mt-4 mb-2 w-full">
        <div className="flex items-center gap-2">
          {/* Navigation or input controls */}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 justify-end">
          {/* Action buttons */}
        </div>
      </div>
    </DrawerHeader>
    
    <div className="p-4">
      {/* Main content */}
    </div>
    
    <DrawerClose asChild>
      <Button variant="outline" size="icon" className="absolute top-4 right-4">
        <X className="h-4 w-4" />
      </Button>
    </DrawerClose>
  </DrawerContent>
</Drawer>
```

### Key Spacing & Structure Rules

#### Entity Information Header Pattern
For entity details, use this standardized header structure:

```tsx
<div className="mb-6 p-4 uppercase">
  <div className="flex gap-8 items-center mb-2">
    <div>
      <div className="text-xs font-bold">FIELD LABEL</div>
      <div className="font-mono">{fieldValue}</div>
    </div>
    <div className="flex-1">
      <div className="text-xs font-bold">LONG FIELD LABEL</div>
      <div className="font-mono truncate">{longFieldValue}</div>
    </div>
  </div>
</div>
```

**Key Characteristics:**
- **Container**: `mb-6 p-4 uppercase` for consistent spacing and typography
- **Field Layout**: `flex gap-8 items-center mb-2` for horizontal field arrangement
- **Labels**: `text-xs font-bold` for small, bold field labels
- **Values**: `font-mono` for monospace field values, `truncate` for long content
- **Flexible Fields**: Use `flex-1` for fields that should expand

#### Vertical Spacing Standards
- **Main container**: `p-6 space-y-6 relative` for consistent outer spacing
- **Entity header**: `mb-6` bottom margin to separate from content
- **Tab content**: `mt-6` top margin for tab content sections
- **Section headers**: `mb-6` for section title spacing
- **Action toolbars**: `mt-4 mb-2` for toolbar sections in headers

#### Typography Hierarchy
- **Drawer titles**: `text-xl font-bold` for main drawer titles
- **Section titles**: `text-lg font-semibold` for content section titles
- **Field labels**: `text-xs font-bold uppercase` for entity field labels
- **Field values**: `font-mono` for data values (IDs, codes, etc.)
- **Descriptions**: `text-sm text-muted-foreground` for subtitle text

### Content Alignment with Tables
When tables are present in drawers:

- **Table spacing**: Use `mt-6` to separate tables from their headers
- **Table container**: Always use `rounded-none bg-background w-full border-2 border-border`
- **Content padding**: Maintain `p-4` or `p-6` container padding around tables
- **Header alignment**: Section headers should align with table edges

## 📝 Form Patterns

### Standard Form Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-[6rem_1fr_2fr] gap-4">
  <div>
    <Label htmlFor="field" className="font-base text-sm">Label</Label>
    <Input id="field" value={value} onChange={handleChange} />
  </div>
</div>
```

### Textarea Pattern
```tsx
<Textarea
  value={value}
  onChange={handleChange}
  className="min-h-[80px] h-24 resize-none w-full"
  placeholder="Placeholder text"
/>
```

## 📱 Responsive Design

### Grid Patterns
```tsx
{/* Cards grid */}
<div className="grid gap-4 md:grid-cols-2">
  {/* Card content */}
</div>

{/* Form grids */}
<div className="grid grid-cols-1 md:grid-cols-[fixed_fr_fr] gap-4">
  {/* Form fields */}
</div>
```

### Mobile Considerations
- Use `px-4 md:px-8` for responsive padding
- Stack elements vertically on mobile: `flex-col md:flex-row`
- Responsive text sizes: `text-sm md:text-base`

## 🎨 Component Variants

### Select Components
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Date Pickers
```tsx
<DatePicker 
  selected={date ? new Date(date) : undefined} 
  onSelect={(date) => {
    const isoDate = date ? date.toISOString().split('T')[0] : null;
    setValue(isoDate);
  }} 
/>
```

### Tooltips
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="outline">
        <Info className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Helpful information</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## 🔄 State Management Patterns

### Loading States
```tsx
{loading ? (
  <div className="flex justify-center items-center h-40">
    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
  </div>
) : (
  // Content
)}
```

### Empty States
```tsx
{items.length === 0 ? (
  <TableRow>
    <TableCell colSpan={columns} className="text-center text-gray-500">
      No items found.
    </TableCell>
  </TableRow>
) : (
  // Table rows
)}
```

### Error Handling
```tsx
try {
  await supabase.from('table').update(data).eq('id', id);
} catch (error) {
  console.error('Error updating:', error);
  // Show user-friendly error message
}
```

## 📊 Data Fetching Patterns

### useEffect for Data Loading
```tsx
useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase.from('table').select('*');
    if (!error && data) {
      setItems(data);
    }
  };
  fetchData();
}, []);
```

### Optimistic Updates
```tsx
// Update UI immediately
setItems(prev => prev.map(item => 
  item.id === id ? { ...item, field: newValue } : item
));

// Then persist to database
await supabase.from('table').update({ field: newValue }).eq('id', id);
```

## 🎯 Accessibility Guidelines

### ARIA Labels
- Always provide `aria-label` for icon-only buttons
- Use `aria-describedby` for form field descriptions
- Include `role="dialog"` for modals

### Keyboard Navigation
- Ensure all interactive elements are focusable
- Implement proper tab order
- Support Escape key for closing modals

### Focus Management
```tsx
// Focus management for drawers
useEffect(() => {
  if (openDrawer && closeButtonRef.current) {
    closeButtonRef.current?.focus();
  }
}, [openDrawer]);
```

## 📏 Icon Standards

### Standard Icon Size
Use `w-4 h-4` for most icons, `w-5 h-5` for larger elements

### Common Icon Mappings
- Add: `Plus`
- **Inline Edit**: `Edit` (always variant="default", with "Editar" tooltip) - for editing fields directly in table
- **View/Open Drawer**: `Eye` (always variant="default", with appropriate tooltip) - for opening detailed view in drawer
- Delete: `Trash2`
- Refresh: `RotateCw`
- Clear/Close: `X`
- Sort: `ArrowUp`, `ArrowDown`
- **Export to Excel**: `Download` (always variant="default", with "Exportar para Excel" tooltip) - for CSV/Excel export functionality
- Status: Use colored dots instead of icons
- File: `FileText`, `FilePlus`
- Notes: `FileText` (always, handled by SimpleNotasPopover/NotasPopover)

### Button Shape Requirements

**CRITICAL: All icon-only buttons MUST be square (same width and height)**

```tsx
{/* ✅ Correct - Square icon button */}
<Button variant="outline" size="icon" className="h-10 w-10">
  <RotateCw className="w-4 h-4" />
</Button>

{/* ❌ Wrong - Rectangular icon button */}
<Button variant="outline" size="icon">
  <RotateCw className="w-4 h-4" />
</Button>
```

**Why Square Buttons Are Required:**
- **Visual Consistency**: Creates uniform, predictable interface elements
- **Better Alignment**: Square buttons align properly in button groups and toolbars
- **Professional Appearance**: Maintains clean, geometric design language
- **Accessibility**: Provides consistent click targets for users

**Implementation:**
- Always add `className="h-10 w-10"` to icon-only buttons
- Use `size="icon"` combined with explicit width/height classes
- This applies to ALL icon buttons: refresh, clear, edit, delete, view, etc.
- Text buttons (with icons) should NOT have width constraints - only height

## 🎨 CSS Custom Properties

Use these custom properties consistently:
- `var(--main)` - Primary background
- `var(--orange)` - Table headers, accent elements  
- `var(--blue-light)` - Warning states, secondary indicators

## 📋 Checklist for New Pages

- [ ] Use standard container structure
- [ ] Implement consistent header hierarchy
- [ ] Add proper spacing classes
- [ ] Include loading and empty states
- [ ] Implement responsive design
- [ ] Add proper ARIA labels
- [ ] Use consistent button variants
- [ ] Follow table header patterns (if applicable)
- [ ] Include proper error handling
- [ ] Use consistent icon sizes
- [ ] Implement optimistic updates for forms
- [ ] Add tooltips for additional context
- [ ] Follow filter bar patterns (if applicable)
- [ ] Use consistent color scheme
- [ ] Test keyboard navigation
- [ ] **Implement notes buttons with mandatory tooltips (if applicable)**
- [ ] **Use FileText icon for all notes buttons**
- [ ] **Ensure notes tooltips show content on hover**
- [ ] Every table includes a refresh button in the filter/action bar, always as an icon-only button (no text)
- [ ] All table headers use both font-bold and uppercase classes
- [ ] **For inline editing**: Use Edit icon with variant="default", size="icon", "Editar" tooltip, makes table row fields editable with save/cancel buttons
- [ ] **For drawer opening**: Use Eye icon with variant="default", size="icon", appropriate tooltip, opens detailed view in drawer
- [ ] All tables use consistent action button patterns based on their functionality (inline edit vs drawer view)
- [ ] All export-to-Excel actions use the standard Exportar Excel button: icon-only, Download icon, variant="default" (primary color), size="icon", always wrapped in a Tooltip with label 'Exportar para Excel'
- [ ] All notas (notes) buttons follow the style: icon-only, FileText icon, buttonSize="icon", className="mx-auto aspect-square", variant="link" if notes exist, variant="ghost" if empty, always wrapped in a Tooltip showing full notes content on hover
- [ ] All icon-only buttons are wrapped in a Tooltip with a clear, descriptive label
- [ ] **Table Component Consistency**: All inputs use `h-10` height, item fields use `Textarea` for wrapping, date pickers specify `buttonClassName="w-full h-10"`
- [ ] **Table Input Styling**: All table inputs use borderless styling: `border-0 outline-0 focus:ring-0 focus:border-0`
- [ ] **Item Field Wrapping**: Use `Textarea` with `rows={2}`, `resize-none`, and `min-h-[40px]` for item/description columns
- [ ] **Visual Alignment**: All interactive elements within tables have consistent 40px (`h-10`) height
- [ ] **Button Height Consistency**: Never use `size="sm"`, use default or `size="icon"` to maintain `h-10` height
- [ ] **Header Button Standards**: All header buttons use proper Button components and match combobox heights
- [ ] **Navigation Buttons**: Use Button components instead of custom `<button>` elements for consistent styling
- [ ] **DatePicker Height**: Always specify `buttonClassName="...h-10"` for explicit height control
- [ ] **Table Padding Consistency**: Use CSS selectors on Table element, remove individual `p-2` from TableCell elements
- [ ] **Spacing Standards**: No extra padding on last column that creates unwanted space between content and table border
- [ ] **AÇÕES Column Fix**: Use `flex gap-2 justify-center` for action button cells, NO px-* padding classes, buttons use `h-10 w-10 rounded-none`
- [ ] **Standard Column Widths**: FO, Guia, and ORC columns always use `w-[90px]` (90px width), date picker columns always use `w-[160px]` (160px width)
- [ ] **Numeric Column Alignment**: FO, ORC, Guia headers are center-aligned with `text-center`, other numeric headers are left-aligned (default), all numeric content is right-aligned with `text-right`
- [ ] **Table Height Policy**: Remove all height constraints (`max-h-[70vh]`, `overflow-y-auto`) from table containers to allow natural page scrolling
- [ ] **Square Icon Buttons**: ALL icon-only buttons must be square using `className="h-10 w-10"` for consistent visual alignment
- [ ] **Chart Container Styling**: All chart containers use `Card` with `rounded-none border-2`, title/subtitle blocks use `leading-tight` and proper spacing

## 🗂️ Drawer Structure Checklist
- [ ] **Drawer Type**: Use appropriate pattern (Form, Entity Detail, or Full-Screen Modal)
- [ ] **Entity Headers**: Use `mb-6 p-4 uppercase` container with `text-xs font-bold` labels and `font-mono` values
- [ ] **Vertical Spacing**: Main containers use `p-6 space-y-6 relative` for consistent spacing
- [ ] **Typography Hierarchy**: Drawer titles use `text-xl font-bold`, section titles use `text-lg font-semibold`
- [ ] **Table Integration**: Tables use `mt-6` spacing from headers and proper container structure
- [ ] **Close Button**: Always positioned `absolute top-6 right-6 z-10` for entity detail drawers

## 🔗 Component Dependencies

All pages should import these common shadcn components:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

**For pages with notes functionality, also import:**
```tsx
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover';
// OR for complex notes with multiple fields:
import NotasPopover from '@/components/ui/NotasPopover';
```

Common Lucide icons:
```tsx
import { Plus, Eye, Trash2, X, RotateCw, ArrowUp, ArrowDown, Loader2, FileText, Download } from "lucide-react";
```

## 🟧 Border Radius Policy

- **CRITICAL:** All components must use sharp corners: always use `rounded-none`.
- Do not use `rounded`, `rounded-md`, `rounded-base`, or any other border radius utility.
- This applies to all containers, tables, **buttons**, cards, modals, inputs, etc.
- **ALL BUTTONS must include `rounded-none`** in their className to override default button styling.
- **CHARTS:** All chart containers must use `Card` component with `rounded-none border-2` for sharp corners and 2px borders. 

## 📝 Input Field and Component Height Consistency

All form inputs, interactive components, and table elements must follow these conventions to ensure visual consistency:

### Component Height Standards
- **Standard Height:** All buttons, inputs, comboboxes, and date pickers must use `h-10` (40px) for consistent alignment
- **Table Inputs:** All input fields within tables must use `h-10` to match combobox heights
- **Textarea for Long Content:** Use `Textarea` with `min-h-[40px]` and `rows={2}` for fields that need text wrapping (like Item descriptions)

### Input Field Styling
- **Sharp Corners:** Always use `rounded-none` to remove border radius
- **Consistent Height:** Always use `h-10` for standard inputs
- **No Borders in Tables:** Table inputs should use `border-0 outline-0 focus:ring-0 focus:border-0` for borderless appearance
- **No Extra Backgrounds:** Do not add custom background classes unless specified
- **No Placeholder Dashes:** Do not use placeholder dashes (e.g., `placeholder="-"`). Use meaningful placeholders or none as appropriate

### Examples

**Standard Input (Forms):**
```tsx
<Input
  placeholder="Enter value..."
  value={inputValue}
  onChange={handleChange}
  className="h-10 rounded-none"
/>
```

**Table Cell Input (Consistent Height):**
```tsx
<Input
  value={cellValue}
  onChange={handleCellChange}
  onBlur={handleCellSave}
  className="border-0 outline-0 focus:ring-0 focus:border-0 h-10 text-sm"
/>
```

**Table Cell Textarea (Wrappable Content):**
```tsx
<Textarea
  value={longContent}
  onChange={handleChange}
  onBlur={handleSave}
  className="border-0 outline-0 focus:ring-0 focus:border-0 min-h-[40px] resize-none text-sm"
  rows={2}
/>
```

**Numeric Input (Right-aligned, Consistent Height):**
```tsx
<Input
  type="text"
  value={numericValue}
  onChange={handleChange}
  className="border-0 outline-0 focus:ring-0 focus:border-0 h-10 text-sm text-right"
/>
```

**Filter Input (Fixed width, Standard Height):**
```tsx
<Input
  placeholder="Filter field..."
  value={filterValue}
  onChange={handleFilter}
  className="h-10 rounded-none w-28"
/>
```

**DatePicker (Consistent Height):**
```tsx
<DatePicker
  selected={date}
  onSelect={handleDateChange}
  buttonClassName="w-full h-10"
/>
```

### Component Height Requirements
- **Buttons:** Use default `h-10` from Button component variants (never use `size="sm"`)
- **Comboboxes:** Use default `h-10` from Button component (automatically applied)
- **Date Pickers:** Always specify `buttonClassName="w-full h-10"` or similar
- **Form Inputs:** Always use `h-10` for consistency
- **Table Inputs:** Always use `h-10` to match other interactive elements
- **Textareas:** Use `min-h-[40px]` to match the 40px standard height baseline

### Button Height Consistency Rules
- **Never use `size="sm"`:** This creates 36px height buttons that break visual alignment
- **Default buttons:** Use no size prop (defaults to `h-10`)
- **Icon buttons:** Use `size="icon"` (maintains `h-10` height)
- **Header buttons:** Must match combobox heights - always use default or icon sizing
- **Navigation buttons:** Use proper Button components instead of custom `<button>` elements

### Common Header Button Patterns
```tsx
{/* Text button - default height */}
<Button variant="outline" onClick={handleAction}>
  <RefreshCcw className="w-4 h-4 mr-2" />
  Refresh
</Button>

{/* Icon-only button - maintains h-10 */}
<Button variant="outline" size="icon" onClick={handleAction}>
  <Plus className="w-4 h-4" />
</Button>

{/* Navigation buttons */}
<Button variant="outline" size="icon" aria-label="Previous">
  <ArrowLeft className="w-4 h-4" />
</Button>

{/* Close button in drawer */}
<DrawerClose asChild>
  <Button variant="outline" size="icon" className="absolute top-4 right-4">
    <X className="w-4 h-4" />
  </Button>
</DrawerClose>
```

### DatePicker Height Specification
Always specify height explicitly for DatePickers:
```tsx
<DatePicker
  selected={date}
  onSelect={handleDateChange}
  buttonClassName="w-auto h-10"  {/* Must specify h-10 */}
/>
```

> **Critical:** All interactive form elements must use the same 40px (`h-10`) height for perfect visual alignment. Use `Textarea` with `min-h-[40px]` for content that needs to wrap, ensuring the baseline height matches other components.

## 📋 Table Numeric Alignment

### Header vs Content Alignment
Different numeric column types have different alignment patterns:

**Numeric ID Columns (FO, ORC, Guia):**
- **Headers:** Center-aligned using `text-center`
- **Content:** Right-aligned using `text-right`

**Other Numeric Columns (Quantidade, Preços, Totais):**
- **Headers:** Left-aligned (default)
- **Content:** Right-aligned using `text-right`

### Examples
```tsx
// Numeric ID columns (FO, ORC, Guia)
<TableHead className="text-center w-[90px]">FO</TableHead>
<TableCell className="text-right">{item.numero_fo}</TableCell>

// Other numeric columns (Quantidade, etc.)
<TableHead className="w-[120px]">Quantidade</TableHead>
<TableCell className="text-right">{item.quantidade}</TableCell>
```

> **Note:** This creates visual hierarchy where ID columns are centrally prominent while maintaining right-alignment for easy numeric comparison in content. 

## 📊 Charts and Data Visualization

### Chart Library and Dependencies
Use **Recharts** library for all chart implementations:
```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
```

Required packages:
- `recharts` - Main charting library
- CSS-in-JS transparency calculations for color variations

### Chart Color Palette

#### Primary Color Scheme
Use this exact color palette for consistency across all charts:

```tsx
const CHART_COLORS = {
  // Material type colors
  cartaoFavo: '#f9d16a',      // Soft pastel yellow - for Cartão & Favo materials
  rigidosOutros: '#2a687a',   // Muted teal blue - for other rigid materials  
  flexiveis: '#72a25e',       // Earthy green - for flexible materials
  warning: '#c3b49e',         // Warm beige - for warnings/neutral states
  critical: '#3c3434'         // Dark charcoal brown - for critical states
};
```

#### Color Usage Guidelines
- **Cartão & Favo Materials:** Always use `#f9d16a` (soft pastel yellow)
- **Other Rigid Materials:** Always use `#2a687a` (muted teal blue)
- **Flexible Materials:** Always use `#72a25e` (earthy green)
- **Warning/Empty States:** Use `#c3b49e` (warm beige)
- **Critical/Error States:** Use `#3c3434` (dark charcoal brown)

### Transparency-Based Color System

#### Base Colors with Transparency Variations
For multiple materials within the same category, use transparency variations:

```tsx
const generateTransparencyColors = (baseColor: string, materialCount: number) => {
  const transparencies = [1.0, 0.85, 0.7, 0.55, 0.4]; // First 5 materials
  const additionalTransparencies = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]; // For 6+ materials
  
  return materials.map((_, index) => {
    const colorIndex = index % 5; // Cycle through 5 base colors
    const transparency = index < 5 
      ? transparencies[index] 
      : additionalTransparencies[index % additionalTransparencies.length];
    
    return convertToRgba(BASE_COLORS[colorIndex], transparency);
  });
};
```

#### Color Assignment Logic
1. **First 5 materials:** Use base color with 100%, 85%, 70%, 55%, 40% opacity
2. **Additional materials:** Cycle through base colors with decreasing transparency
3. **Minimum opacity:** Never go below 30% opacity for readability

### Chart Container Styling Requirements

All chart containers must follow these styling requirements:

#### Sharp Corners and Thick Borders
```tsx
{/* ✅ Correct - Sharp corners with 2px border */}
<Card className="p-4 rounded-none border-2">
  {/* Chart content */}
</Card>

{/* ❌ Wrong - Rounded corners with thin border */}
<Card className="p-4 rounded-lg border">
  {/* Chart content */}
</Card>
```

#### Title and Subtitle Block Structure
Chart titles with subtitles must form a cohesive visual block:

```tsx
{/* ✅ Correct - Tight title/subtitle block */}
<Card className="p-4 rounded-none border-2">
  <div className="mb-4">
    <h3 className="text-lg font-semibold leading-tight">Chart Title</h3>
    <p className="text-sm text-muted-foreground leading-tight">Chart Subtitle</p>
  </div>
  <ResponsiveContainer>
    {/* Chart component */}
  </ResponsiveContainer>
</Card>

{/* ❌ Wrong - Separated title and subtitle */}
<Card className="p-4 rounded-none border-2">
  <h3 className="text-lg font-semibold mb-2">Chart Title</h3>
  <p className="text-sm text-muted-foreground mb-4">Chart Subtitle</p>
  <ResponsiveContainer>
    {/* Chart component */}
  </ResponsiveContainer>
</Card>
```

**Key Requirements:**
- **Container:** Always use `Card` component with `rounded-none border-2`
- **Title Block:** Wrap title and subtitle in a `div` with `mb-4`
- **Typography:** Use `leading-tight` on both title and subtitle for compact spacing
- **No gaps:** Title and subtitle should appear as a single visual unit

### Chart Types and Specifications

#### Overview Cards (Monetary Values)
Display financial summaries using consistent card layout:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <Card className="p-4 rounded-none border-2">
    <h3 className="text-sm font-medium text-muted-foreground">Card Title</h3>
    <p className="text-2xl font-bold">€{value.toLocaleString()}</p>
  </Card>
</div>
```

**Card Categories:**
- **Total Cartão & Favo:** Primary material category
- **Total Rígidos Outros:** Secondary rigid materials (excluding Cartão/Favo)
- **Total Flexíveis:** All flexible materials
- **Total Geral:** Sum of all material values

#### Bar Charts
Use for stock quantity comparisons:

```tsx
<ResponsiveContainer width="100%" height={550}>
  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis 
      dataKey="name" 
      angle={-45} 
      textAnchor="end" 
      height={120}
      interval={0}
    />
    <YAxis />
    <Tooltip 
      formatter={(value: number) => [value.toLocaleString(), 'Stock']}
      labelStyle={{ color: '#333' }}
      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
    />
    <Bar dataKey="stock" fill={chartColor} />
  </BarChart>
</ResponsiveContainer>
```

**Bar Chart Specifications:**
- **Height:** 550px for adequate label space
- **Bottom margin:** 120px for rotated labels
- **Angle:** -45 degrees for X-axis labels
- **Data formatting:** Use `toLocaleString()` for number formatting

#### Pie Charts
Use for percentage distribution visualization:

```tsx
<ResponsiveContainer width="100%" height={700}>
  <PieChart>
    <Pie
      data={chartData}
      cx="50%"
      cy="50%"
      outerRadius={280}
      fill="#8884d8"
      dataKey="value"
      label={({ name, value }) => `${name}: ${value}%`}
    >
      {chartData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={colors[index]} />
      ))}
    </Pie>
    <Tooltip 
      formatter={(value: number) => [`${value}%`, 'Percentage']}
      labelStyle={{ color: '#333' }}
      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
    />
  </PieChart>
</ResponsiveContainer>
```

**Pie Chart Specifications:**
- **Height:** 700px for better visibility
- **Radius:** 280px for large, readable charts
- **Labels:** Show both name and percentage value
- **Tooltips:** Format percentages with % symbol

### Chart Data Processing

#### Material Categorization Logic
```tsx
const processStockData = (stockEntries: StockEntry[]) => {
  // Filter for materials with positive stock
  const validStock = stockEntries.filter(entry => getFinalStock(entry) > 0);
  
  // Categorize materials
  const cartaoFavoMaterials = validStock.filter(entry => 
    entry.material.toLowerCase().includes('cartão') || 
    entry.material.toLowerCase().includes('favo')
  );
  
  const rigidosMaterials = validStock.filter(entry => 
    entry.tipo === 'RÍGIDOS' && 
    !entry.material.toLowerCase().includes('cartão') && 
    !entry.material.toLowerCase().includes('favo')
  );
  
  const flexiveisMaterials = validStock.filter(entry => 
    entry.tipo === 'FLEXÍVEIS'
  );
  
  return { cartaoFavoMaterials, rigidosMaterials, flexiveisMaterials };
};
```

#### Stock Value Calculation
```tsx
const getFinalStock = (entry: StockEntry): number => {
  // Use corrected stock if available, otherwise use current stock
  return entry.stock_correct !== null ? entry.stock_correct : entry.stock_atual;
};

const calculateTotalValue = (materials: StockEntry[]): number => {
  return materials.reduce((total, material) => {
    const stock = getFinalStock(material);
    const price = material.preco || 0;
    return total + (stock * price);
  }, 0);
};
```

### Chart Container Structure

#### Tab-Based Chart Layout
```tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
    <TabsTrigger value="rigidos">Materiais Rígidos</TabsTrigger>
    <TabsTrigger value="flexiveis">Materiais Flexíveis</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview" className="space-y-4">
    {/* Overview cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Cards content */}
    </div>
  </TabsContent>
  
  <TabsContent value="rigidos" className="space-y-4">
    {/* Rigid materials charts in 2x2 grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart containers */}
    </div>
  </TabsContent>
</Tabs>
```

#### Chart Grid Layout
```tsx
{/* 2x2 grid for related charts */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <Card className="p-4 rounded-none border-2">
    <div className="mb-4">
      <h3 className="text-lg font-semibold leading-tight">Chart Title</h3>
      <p className="text-sm text-muted-foreground leading-tight">Chart Subtitle</p>
    </div>
    {/* Chart component */}
  </Card>
</div>
```

### Empty State Handling

#### No Data Messages
```tsx
{materials.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <Package className="w-12 h-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold text-muted-foreground">
      Nenhum Material Encontrado
    </h3>
    <p className="text-muted-foreground">
      Não existem materiais desta categoria com stock positivo.
    </p>
  </div>
) : (
  /* Chart content */
)}
```

**Empty State Guidelines:**
- Use relevant icons (Package for stock, FileText for data)
- Clear, descriptive messages in Portuguese
- Consistent spacing and typography
- Muted colors for empty states

### Data Integration Patterns

#### Component Props Interface
```tsx
interface StockAnalyticsChartsProps {
  currentStocks: StockEntry[];
  onRefresh: () => Promise<void>;
}

interface StockEntry {
  id: string;
  material: string;
  tipo: 'RÍGIDOS' | 'FLEXÍVEIS';
  stock_atual: number;
  stock_correct: number | null;
  stock_correct_updated_at: string | null;
  preco: number | null;
}
```

#### Refresh Integration
```tsx
<div className="flex justify-between items-center mb-4">
  <h2 className="text-xl font-bold">Chart Section</h2>
  <Button 
    variant="outline" 
    size="icon" 
    onClick={onRefresh}
    className="h-10 w-10 rounded-none"
  >
    <RotateCw className="w-4 h-4" />
  </Button>
</div>
```

### Chart Accessibility

#### Screen Reader Support
- Use semantic HTML structure
- Provide alt text for chart descriptions
- Include data summaries for complex visualizations
- Ensure keyboard navigation works for interactive elements

#### Color Accessibility
- Maintain sufficient contrast ratios
- Use transparency thoughtfully to preserve readability
- Provide alternative data representations when needed
- Test with colorblind-friendly tools

### Chart Performance Guidelines

#### Data Optimization
- Filter unnecessary data before chart rendering
- Use `useMemo` for expensive calculations
- Implement lazy loading for large datasets
- Cache processed chart data when appropriate

#### Responsive Considerations
- Use `ResponsiveContainer` for all charts
- Test chart readability on mobile devices
- Adjust chart heights for different screen sizes
- Consider simplified views for small screens

### Integration with Existing Page Structure

#### Page Tab Addition
```tsx
<TabsList className="grid w-full grid-cols-4"> {/* Updated from grid-cols-3 */}
  <TabsTrigger value="entradas">Entradas de Stock</TabsTrigger>
  <TabsTrigger value="atual">Stock Atual</TabsTrigger>
  <TabsTrigger value="palettes">Gestão de Palettes</TabsTrigger>
  <TabsTrigger value="analytics">Análise & Gráficos</TabsTrigger> {/* New tab */}
</TabsList>

<TabsContent value="analytics">
  <StockAnalyticsCharts 
    currentStocks={currentStocks} 
    onRefresh={refreshStockData}
  />
</TabsContent>
```

**Integration Requirements:**
- Update grid columns when adding chart tabs
- Pass current data and refresh callback
- Maintain existing page functionality
- Follow established tab naming patterns

### Designer Analytics Implementation

The Designer Analytics component follows the exact same pattern as Production Analytics, maintaining consistency across the application while focusing on design workflow metrics.

**Key Designer Metrics:**

1. **Monthly Items Count:** Tracked from `items_base` table
2. **Average Completion Time:** Data-In to Paginação from `designer_items` table  
3. **Complexity Analysis:** Work distribution by complexity type
4. **Team Performance:** Designer FO assignments and completion rates

**Tab Structure:**
```tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-3 rounded-none border-2">
    <TabsTrigger value="overview" className="rounded-none">Visão Geral</TabsTrigger>
    <TabsTrigger value="complexity" className="rounded-none">Análise por Complexidade</TabsTrigger>
    <TabsTrigger value="team" className="rounded-none">Performance da Equipa</TabsTrigger>
  </TabsList>
</Tabs>
```

**Database Queries:**
- `items_base` with `folhas_obras` join for monthly counts
- `designer_items` with completion time calculations
- `profiles` join for designer team analysis
- Current year filtering consistent with production analytics

**Chart Types Used:**
- Bar charts for monthly item counts
- Line charts for average completion times
- Stacked bar charts for complexity distribution
- Horizontal bar charts for team performance

## Tooltips

- All tooltips must use small caps: capitalize only the first letter, rest lowercase (e.g. "Adicionar", "Atualizar").
- Do not use all uppercase or all lowercase for tooltips.
- Exceptions: acronyms, code, or special cases may use their standard casing. 