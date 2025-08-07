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

### Sorting Implementation Patterns

#### Smart Numeric Sorting Helper Function
Add this helper function for mixed numeric/text fields (ORC, FO):

```typescript
// Helper function for smart numeric sorting (handles mixed text/number fields)
const parseNumericField = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  
  const strValue = String(value).trim()
  if (strValue === '') return 0
  
  // Try to parse as number
  const numValue = Number(strValue)
  if (!isNaN(numValue)) return numValue
  
  // For non-numeric values (letters), sort them after all numbers
  // Use a high number + character code for consistent ordering
  return 999999 + strValue.charCodeAt(0)
}
```

#### Column-Specific Sorting Logic
Use these patterns in your sorting switch statement:

```typescript
switch (sortCol) {
  case 'created_at': // For DATA columns
    // Use data_in (input date) instead of created_at for proper date sorting
    A = a.data_in ? new Date(a.data_in).getTime() : 0
    B = b.data_in ? new Date(b.data_in).getTime() : 0
    break
    
  case 'numero_orc': // For ORC columns
    // Smart numeric sorting: numbers first, then letters
    A = parseNumericField(a.numero_orc)
    B = parseNumericField(b.numero_orc)
    break
    
  case 'numero_fo': // For FO columns
    // Smart numeric sorting: numbers first, then letters
    A = parseNumericField(a.numero_fo)
    B = parseNumericField(b.numero_fo)
    break
}
```

#### Database Query Requirements
- For date sorting: Ensure `data_in` field is included in SELECT queries
- Default ordering should use `ORDER BY data_in DESC` instead of `created_at`

#### Display Updates Required
- Update table cells to show `formatDatePortuguese(job.data_in)` instead of `job.created_at`
- Update priority color functions to use `job.data_in` instead of `job.created_at`
- Update tooltip calculations to use `job.data_in` for age-based messages

#### Preventing Auto-Sort on Data Changes
Implement manual sorting control to prevent automatic re-sorting when data is inserted:

```typescript
// State management for manual sorting control
const [hasUserSorted, setHasUserSorted] = useState(false) // Track if user has manually sorted

// Toggle sort function - only enables sorting when user clicks headers
const toggleSort = useCallback(
  (c: SortableKey) => {
    setHasUserSorted(true) // Mark that user has manually sorted
    if (sortCol === c) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(c)
      setSortDir('asc')
    }
  },
  [sortCol, sortDir],
)

// Conditional sorting in useMemo
const sorted = useMemo(() => {
  // Only apply sorting if user has manually sorted
  if (!hasUserSorted) {
    return [...filtered] // Return unsorted data
  }
  
  // Apply sorting logic only after user interaction
  const arr = [...filtered]
  arr.sort((a, b) => {
    // ... sorting logic here ...
  })
  return arr
}, [filtered, sortCol, sortDir, hasUserSorted, /* other dependencies */])
```

#### Key Benefits
- **Initial state**: Data displays in database order (no automatic sorting)
- **User control**: Sorting only activates when user clicks column headers
- **Data insertion**: New records don't trigger re-sorting, maintaining user's chosen order
- **Performance**: Avoids unnecessary sorting operations on every data change