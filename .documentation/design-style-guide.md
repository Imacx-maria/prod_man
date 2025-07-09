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
```tsx
<div className="rounded-md bg-background w-full border-2 border-border">
  <div className="max-h-[70vh] overflow-y-auto w-full">
    <Table className="w-full border-0">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky top-0 z-10 bg-[var(--orange)] border-b-2 border-border w-[120px] font-bold uppercase">
            Data
          </TableHead>
          {/* ...other headers... */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Table content */}
      </TableBody>
    </Table>
  </div>
</div>
```

- Always use `border-2 border-border` and `rounded-none` on the outer table container for a 2px border and sharp corners.
- Add `rounded-none` to all scroll wrappers and the `<Table>` element to guarantee sharp corners.
- Use `border-b-2 border-border` on all `<TableHead>` for a 2px header outline.
- Set `border-0` on the `<Table>` to avoid double borders.
- Do not add additional borders to `<TableRow>` or `<TableCell>` unless needed for row/column separation.
- **Note:** Always check for and override any default or inherited `border-radius` on table, wrapper, or parent elements to ensure perfectly sharp corners.

### Column Width Patterns
```tsx
// Fixed widths for specific content types
<TableHead className="w-[90px]">Date</TableHead>
<TableHead className="w-[60px]">ID</TableHead>
<TableHead className="w-[140px]">Select</TableHead>
<TableHead className="w-[180px]">Status</TableHead>
<TableHead className="w-[36px] text-center">Icon</TableHead>

// Flexible content
<TableHead className="min-w-[200px]">Description</TableHead>
<TableHead className="flex-1">Long Content</TableHead>
```

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
```tsx
{/* Primary actions */}
<Button variant="default" size="icon">
  <Plus className="w-4 h-4" />
</Button>

{/* Edit button (always icon-only with tooltip) */}
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="default" size="icon">
        <Edit className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Editar</TooltipContent>
  </Tooltip>
</TooltipProvider>

{/* Refresh button (always icon-only, no text) */}
<Button variant="outline" size="icon" onClick={refreshTable}>
  <RotateCw className="w-4 h-4" />
</Button>

{/* Secondary actions */}
<Button variant="outline" size="icon">
  <Eye className="w-4 h-4" />
</Button>

{/* Destructive actions */}
<Button variant="destructive" size="icon">
  <Trash2 className="w-4 h-4" />
</Button>

{/* Icon with text */}
<Button variant="default" size="sm">
  <Plus className="w-4 h-4 mr-2" /> Add Item
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
          contacto={row.contacto || ''}
          telefone={row.telefone || ''}
          contacto_entrega={row.contacto_entrega || ''}
          telefone_entrega={row.telefone_entrega || ''}
          data={row.data || tableDate}
          onChange={(value) => handleEdit(row.id, 'notas', value)}
          onSave={async (fields) => {
            await onNotasSave(row, fields.outras, fields.contacto, fields.telefone, 
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

### Standard Drawer Structure
```tsx
<Drawer open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
  <DrawerContent className="h-screen min-h-screen !top-0 !mt-0">
    <div className="w-full px-4 md:px-8 flex flex-col h-full">
      <DrawerHeader className="flex-none">
        <div className="flex justify-end items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            Add Item
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="sm">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </div>
        <DrawerTitle>Title</DrawerTitle>
        <DrawerDescription>Description</DrawerDescription>
      </DrawerHeader>
      
      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        {/* Drawer content */}
      </div>
    </div>
  </DrawerContent>
</Drawer>
```

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
- Close: `X`
- Sort: `ArrowUp`, `ArrowDown`
- Status: Use colored dots instead of icons
- File: `FileText`, `FilePlus`
- Notes: `FileText` (always, handled by SimpleNotasPopover/NotasPopover)

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
- [ ] All export-to-Excel actions use the standard Exportar Excel button: icon-only, FileSpreadsheet icon, variant="default" (primary color), size="icon", always wrapped in a Tooltip with label 'Exportar Excel'
- [ ] All notas (notes) buttons follow the style: icon-only, FileText icon, buttonSize="icon", className="mx-auto aspect-square", variant="link" if notes exist, variant="ghost" if empty, always wrapped in a Tooltip showing full notes content on hover
- [ ] All icon-only buttons are wrapped in a Tooltip with a clear, descriptive label.

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
import { Plus, Eye, Trash2, X, RotateCw, ArrowUp, ArrowDown, Loader2, FileText, FileSpreadsheet } from "lucide-react";
```

## 🟧 Border Radius Policy

- All components must use sharp corners: always use `rounded-none`.
- Do not use `rounded`, `rounded-md`, `rounded-base`, or any other border radius utility.
- This applies to all containers, tables, buttons, cards, modals, etc. 

## 📝 Input Field Styling

All input fields must follow these conventions to ensure visual consistency across the application:

- **Sharp Corners:** Always use `rounded-none` to remove border radius.
- **No Borders:** Do not use `border`, `border-2`, `border-input`, or any border classes. Input fields should have no visible borders.
- **No Outlines:** Input fields should have no focus outlines or any other outline styles.
- **No Extra Backgrounds:** Do not add custom background classes unless specified.
- **No Placeholder Dashes:** Do not use placeholder dashes (e.g., `placeholder="-"`). Use meaningful placeholders or none as appropriate.
- **No Duplicate className:** Each input should have only one `className` attribute.

### Examples

**Standard Input:**
```tsx
<Input
  placeholder="Enter value..."
  value={inputValue}
  onChange={handleChange}
  className="rounded-none"
/>
```

**Table Cell Input:**
```tsx
<Input
  value={cellValue}
  onChange={handleCellChange}
  onBlur={handleCellSave}
  className="rounded-none w-full"
/>
```

**Numeric Input (right-aligned):**
```tsx
<Input
  type="text"
  value={numericValue}
  onChange={handleChange}
  className="rounded-none text-right"
/>
```

**Filter Input (fixed width):**
```tsx
<Input
  placeholder="Filter field..."
  value={filterValue}
  onChange={handleFilter}
  className="rounded-none w-28"
/>
```

> **Note:** Never use `rounded`, `rounded-md`, or any border radius utility for input fields. All input fields must have sharp corners with no visible borders or outlines as per the design system. This ensures a clean, minimal appearance across all tables and forms.

## 📋 Table Numeric Alignment

- **Right-align all numeric data:** For any table column that displays numbers (quantities, prices, totals, etc.), always use `text-right` on both `<TableHead>` and `<TableCell>`.
- This ensures numbers are visually aligned for easier comparison and a professional look.
- Apply this rule to all tables in the application.

### Example
```tsx
<TableHead className="text-right w-[120px]">Quantidade</TableHead>
<TableCell className="text-right">{item.quantidade}</TableCell>
```

> **Note:** Always review table columns and add `text-right` to any numeric field, including calculated values, prices, and totals. 

## Tooltips

- All tooltips must use small caps: capitalize only the first letter, rest lowercase (e.g. "Adicionar", "Atualizar").
- Do not use all uppercase or all lowercase for tooltips.
- Exceptions: acronyms, code, or special cases may use their standard casing. 