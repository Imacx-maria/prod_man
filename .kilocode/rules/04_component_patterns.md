# IMACX Component Patterns

## 📑 Drawer/Modal Patterns

### Drawer Content Structure & Spacing
- Form drawers (Settings/CRUD):
  - `<DrawerContent className="h-screen min-h-screen !top-0 !mt-0 rounded-none">`
  - `<div className="w-full px-4 md:px-8 flex flex-col h-full">`
- Entity detail drawers (Production/Logistics):
  - `<DrawerContent className="h-[98vh] min-h-[98vh] max-h-[98vh] !top-0 overflow-y-auto">`
  - `<div className="p-6 space-y-6 relative">`
- Full-screen modal drawers (Complex Operations):
  - `<DrawerContent className="overflow-hidden h-screen min-h-screen !top-0 !mt-0 max-w-[95vw] mx-auto bg-background p-0 border border-border shadow-md">`

### Entity Information Header Pattern
- `<div className="mb-6 p-4 uppercase">`
- `<div className="flex gap-8 items-center mb-2">`
- Labels: `<div className="text-xs font-bold">FIELD LABEL</div>`
- Values: `<div className="font-mono">{fieldValue}</div>`

### Vertical Spacing Standards
- Main container: `p-6 space-y-6 relative`
- Entity header: `mb-6` bottom margin
- Tab content: `mt-6` top margin
- Section headers: `mb-6`
- Action toolbars: `mt-4 mb-2`

## 🎯 Interactive Elements

### Button Patterns
- Icon buttons - Must be perfect SQUARES:
  - `<Button variant="default" size="icon" className="!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square">`
- Export to Excel buttons:
  - Always use Download icon with default variant
  - Wrap in Tooltip with "Exportar para Excel" content
- Text buttons - Sharp corners only:
  - `<Button variant="default" className="h-10 rounded-none gap-2">`

### Icon-Only Button Tooltip Pattern
- All icon-only buttons must be wrapped in a Tooltip with a clear label
- Use TooltipProvider, Tooltip, TooltipTrigger (with asChild), and TooltipContent
- The Tooltip should use a concise, user-friendly label

### Notes Button Pattern
- Use SimpleNotasPopover component
- Wrap in TooltipProvider and Tooltip
- Show tooltip with notes content on hover when notes exist
- Use `className="mx-auto aspect-square"` for consistent appearance
- Always use `buttonSize="icon"`

### Status Checkboxes
- Use Checkbox component with checked state and onCheckedChange handler
- Update local state optimistically
- Persist to database after state update

### Inline Editing Pattern
- Use Edit icon button to make row fields editable
- Manage editing state with useState hooks
- Provide save/cancel buttons for edited fields
- Implement complete save handler with optimistic updates

## 📏 Component Consistency Requirements

### Height Standardization
- All inputs within tables: Must use `h-10` (40px height)
- All buttons: Must use default `h-10` from Button component
- All comboboxes: Automatically use `h-10` from Button component
- All date pickers: Must specify `buttonClassName="w-full h-10"`
- Text areas for wrappable content: Must use `min-h-[40px]` with `rows={2}`

### Item Field Wrapping
- Item/Description columns: Must use `Textarea` component instead of `Input`
- Configuration: Use `rows={2}`, `resize-none`, and `min-h-[40px]`
- Purpose: Allows long item descriptions to wrap properly

### Table Input Styling
- All inputs within table cells must use borderless styling:
  - `className="border-0 outline-0 focus:ring-0 focus:border-0 h-10 text-sm"`

### Table Padding Consistency
- Use CSS selectors on Table element: `[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2`
- Remove individual `p-*` from TableCell elements
- Action cells should use `flex gap-2 justify-center` for proper button alignment