# IMACX Project Kilo Rules for Claude

This file codifies the rules for the IMACX project, providing Claude with clear guidelines on project structure, design patterns, component usage, and workflow processes to ensure consistent, high-quality assistance.

## 🗂️ Project Structure

### App Router Structure
- `/src/app/`: Contains all Next.js App Router pages and layouts
  - Each feature has its own folder (e.g., `/dashboard/`, `/producao/`, `/definicoes/`)
  - API routes are in `/src/app/api/`
  - Components specific to a page are in the page's folder

### Component Organization
- `/src/components/`: Houses all reusable components
  - `/ui/`: UI primitives (button, table, input, etc.)
  - Feature-specific components at the root level
  - `/examples/`: Example implementations

### Other Key Directories
- `/src/hooks/`: Custom React hooks
- `/src/lib/`: Domain-specific utilities
- `/src/utils/`: General helper functions
- `/src/types/`: TypeScript type definitions
- `/src/providers/`: Context providers
- `/tests/`: Test files mirroring the src structure

### File Placement Rules
- New components should be placed in the appropriate directory based on their scope and reusability
- Page-specific components go in the page's directory
- Reusable components go in `/src/components/`
- UI primitives go in `/src/components/ui/`

## 🎨 Design Style Guide

### Layout Structure
- Main container: `<div className="w-full space-y-6">...</div>`
- Alternative contained layout: `<div className="container mx-auto py-10">...</div>`
- Page headers: `<h1 className="text-2xl font-bold">Page Title</h1>`
- Section headers: `<h2 className="mb-6 text-2xl font-bold">Section Title</h2>`

### Spacing
- `space-y-6` for main page sections
- `space-y-4` for form sections
- `gap-4` or `gap-2` for flex containers
- `mb-6` for section headers
- `mb-4` for subsection headers

### Color System
- Status indicators use consistent colors:
  - Success: `bg-green-600`
  - Warning: `bg-orange-500`
  - Error: `bg-red-600`
  - Info: `bg-[var(--blue-light)]`
- Background colors:
  - Primary backgrounds: `bg-[var(--main)]`
  - Table headers: `bg-[var(--orange)]`
  - Card/drawer content: `bg-background`
- Hover colors:
  - Table rows: `hover:bg-[var(--main)]`
  - Interactive elements: `hover:bg-[var(--main)]`
  - Never use orange hover: Avoid `hover:bg-[var(--orange)]`

### Border Radius Policy
- All components must use sharp corners: always use `rounded-none`
- Do not use `rounded`, `rounded-md`, `rounded-base`, or any other border radius utility
- This applies to all containers, tables, buttons, cards, modals, inputs, etc.
- ALL BUTTONS must include `rounded-none` in their className

## 📋 Table Design Patterns

### Standard Table Structure
- Tables are FULL-WIDTH: Always use `w-full` on table containers, wrappers, and Table element
- Use `border-2 border-border` and `rounded-none` on the outer table container
- Add `rounded-none` to all scroll wrappers and the `<Table>` element
- Use `border-b-2 border-border` on all `<TableHead>` elements
- Set `border-0` on the `<Table>` to avoid double borders
- Table padding: Use CSS selectors `[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2` on Table element

### AÇÕES Column Requirements
- AÇÕES columns show action buttons (edit, delete, view, etc.)
- Always center-aligned: Use `text-center` on AÇÕES headers
- Width by button count:
  - 2 buttons: `w-[90px]`
  - 3 buttons: `w-[140px]`
  - 4+ buttons: `w-[180px]`
- Button spacing: Use `flex gap-2 justify-center` directly on TableCell
- Perfect square buttons: All action buttons MUST use `!h-10 !w-10 !min-w-10 !max-w-10 !p-0 !rounded-none aspect-square`

### Table Height Policy
- Remove all height constraints (`max-h-[70vh]`, `overflow-y-auto`) from table containers
- Allow tables to expand naturally with page scrolling
- Keep only `w-full rounded-none` for the scroll wrapper container

### Column Width Patterns
- Fixed widths for specific content types:
  - Date columns: `w-[90px]`
  - FO columns: `w-[90px]`
  - Guia columns: `w-[90px]`
  - ORC columns: `w-[90px]`
  - ID columns: `w-[60px]`
  - Select columns: `w-[140px]`
  - Status columns: `w-[180px]`
  - Icon columns: `w-[36px] text-center`
- Flexible content:
  - Description columns: `min-w-[200px]`
  - Long content columns: `flex-1`

### Column Header Alignment
- Center-aligned headers: Use `text-center` for:
  - Actions columns (AÇÕES)
  - Button columns (Notes, Actions)
  - Checkbox columns
  - Radio button columns
  - Numeric ID columns (FO, ORC, Guia)
- Left-aligned headers: All other columns use default left alignment

### Sortable Headers Requirement
- All data tables must implement sortable headers
- Clicking a header should toggle the sort direction (ascending/descending)
- Use visual indicators (up/down arrows) to show the current sort direction

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

## 📏 Icon Standards

### Standard Icon Size
- Use `w-4 h-4` for most icons, `w-5 h-5` for larger elements

### Common Icon Mappings
- Add: `Plus`
- Inline Edit: `Edit` (always variant="default", with "Editar" tooltip)
- View/Open Drawer: `Eye` (always variant="default", with appropriate tooltip)
- Delete: `Trash2`
- Refresh: `RotateCw`
- Clear/Close: `X`
- Sort: `ArrowUp`, `ArrowDown`
- Export to Excel: `Download` (always variant="default", with "Exportar para Excel" tooltip)
- Notes: `FileText` (always, handled by SimpleNotasPopover/NotasPopover)

### Button Shape Requirements
- All icon-only buttons MUST be square (same width and height)
- Always add `className="h-10 w-10"` to icon-only buttons
- Use `size="icon"` combined with explicit width/height classes
- This applies to ALL icon buttons: refresh, clear, edit, delete, view, etc.

## 🧠 AI Assistance Guidelines

### Code Modification Rules
- Only make modifications explicitly requested
- Do not change styling, column widths, or other code not asked for
- Prefer inline editing with an edit button, where changes are inserted and then accepted/refused
- Alert the user what you're doing and why when suggesting changes
- Think through several possible solutions before implementing code

### Multi-Page Problem Handling
- Fix pages one by one
- Ask the user to proceed before continuing to the next page

### Button Style Compliance
- All buttons with icons should be square
- Every table's AÇÕES header should be centered over its action buttons
- Tables should always take full width in the application
- Table containers should use w-fit instead of w-full
- Actions column header width should be set to w-[100px]
- Every 'AÇÕES' header should be centered above action buttons

### Terminal Command Preference
- The user prefers to run terminal commands themselves rather than having the assistant run them

### Header Button Consistency
- Header buttons should use a consistent height of h-10 (40px)
- Use default Button size for standard action buttons
- Use size="icon" for icon-only buttons
- Prefer the standard Button component over custom <button> elements with manual padding

## 📋 Workflow Optimization

### Table Editing Workflow
1. Use inline editing with edit button when possible
2. Provide save/cancel buttons for edited fields
3. Update state optimistically
4. Persist changes to database
5. Handle errors gracefully

### Data Fetching Pattern
1. Use useEffect for initial data loading
2. Implement loading states during data fetching
3. Handle empty states when no data is available
4. Provide error handling for failed requests
5. Use optimistic updates for user actions

### Form Submission Process
1. Validate form data before submission
2. Show loading state during submission
3. Handle success and error cases
4. Provide user feedback on submission result
5. Reset form or navigate away on success

## 🔍 AI Code Analysis Guidelines

When analyzing or modifying code, Claude should:

1. **Identify Component Patterns**: Recognize the project's component patterns and maintain consistency
2. **Respect Table Structure**: Ensure table modifications follow the established structure guidelines
3. **Maintain Style Consistency**: Keep styling consistent with the design style guide
4. **Preserve Button Standards**: Ensure all buttons follow the square shape requirement for icon buttons
5. **Check Icon Usage**: Verify icons match their standard mappings
6. **Validate Height Consistency**: Ensure all interactive elements maintain the 40px (h-10) height standard
7. **Review Tooltip Implementation**: Confirm all icon-only buttons have proper tooltips
8. **Assess Drawer Structure**: Verify drawer implementations follow the established patterns
9. **Evaluate Form Patterns**: Ensure forms follow the project's form patterns
10. **Inspect Inline Editing**: Check that inline editing follows the project's pattern

## 📝 Documentation Standards

When creating or updating documentation:

1. Use markdown for all documentation files
2. Place documentation in the `.documentation` directory
3. Use clear section headers with emoji prefixes
4. Include code examples for implementation patterns
5. Provide checklists for verification
6. Document both correct and incorrect implementations
7. Use tables for comparing options or configurations
8. Include visual examples where helpful