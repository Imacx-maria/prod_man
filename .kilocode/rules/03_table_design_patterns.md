# IMACX Table Design Patterns

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