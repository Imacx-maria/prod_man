# 🛠️ How Your Data Tables Are Built

## 1. Component Structure
You use custom UI components for tables:
- `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableHead>`, `<TableBody>`, `<TableCell>`
- Likely wrappers around native HTML `<table>` elements, styled with Tailwind CSS

## 2. Column Widths
- Most `<TableHead>` and `<TableCell>` elements use Tailwind width classes (`w-20`, `w-32`, etc.)
- Keeps columns aligned but risks breaking if:
  - Content changes significantly
  - Column count changes
  - Widths aren't kept consistent

## 3. Sticky Headers
- Headers use `sticky top-0 z-10` to remain visible during vertical scroll

## 4. Overflow Handling
- Table is inside a `div` with `overflow-y-auto` and a height limit (e.g., `max-h-[70vh]`)
- Makes body scrollable while keeping header fixed

## 5. Table Layout
- Uses `table-fixed` layout
  - Widths are controlled by classes, not content
  - If total width exceeds container, horizontal scrolling may occur

## 6. Dynamic Content
- Rows generated dynamically from arrays (e.g., `sortedJobs`, `logisticaItems[job.id]`)
- Cells use the same width classes as headers
  - Misalignment occurs if column count, order, or widths aren't updated together

## 7. Nested Tables/Drawers
- Nested drawers (e.g., for editing) contain their own tables with similar patterns

## 8. Tailwind Utility Classes
- All styling (colors, spacing, alignment) is handled using Tailwind utility classes

## 📏 Column Widths: Fixed vs. Auto

**Best Practice:**  
- **Always set column widths on the `<TableHead>` and `<TableCell>` using Tailwind width classes (e.g., `w-[90px]`, `w-32`).**
- **Never set width classes on the inner content elements** (such as `<Input>`, `<SelectTrigger>`, etc.).  
  - Instead, use `w-full` on these elements so they fill the cell and inherit the column's width.

### **How to Set Fixed Width Columns**
```tsx
<TableHead className="w-[90px] px-2">Print</TableHead>
<TableCell className="w-[90px] px-2">
  <Input className="w-full ..." ... />
</TableCell>
```

### **How to Set Auto Width Columns**
- Omit the `w-[]` class on `<TableHead>` and `<TableCell>`.  
- The column will size automatically based on its content.

### **Why This Matters**
- Setting widths on inner elements (like `<Input className=\"w-[90px]\" />`) causes misalignment and inconsistent spacing between columns.
- The column width should be controlled only by the cell, not by the content inside.

### **Summary Table**

| Column Type   | TableHead/TableCell width | Content width  | Result         |
|---------------|--------------------------|---------------|---------------|
| Fixed         | w-[90px]                 | w-full        | Consistent    |
| Auto          | (none)                   | w-full        | Grows/shrinks |

### **🚫 What Not To Do**
```tsx
<TableHead className="w-[90px] px-2">Print</TableHead>
<TableCell className="w-[90px] px-2">
  <Input className="w-[120px]" ... />  // ❌ Don't do this!
</TableCell>
```

**Always let the column define the width, and the content fill it.**

---

# ⚠️ Common Table Alignment Pitfalls

| Issue | Description |
|-------|-------------|
| Width mismatch | Header and cell widths differ |
| Extra/hidden columns | Conditional rendering causes header/body mismatch |
| Content overflow | Cell content isn't wrapped/truncated |
| Scrollbar | Vertical scroll in body causes horizontal shift |

---

# 💬 Suggested Warning for Alignment Issues

> "Our tables use Tailwind's `table-fixed` layout, with explicit width classes on both headers and cells. Alignment issues usually happen if the width classes are inconsistent, if columns are conditionally rendered, or if content overflows. Please ensure that every `<TableHead>` and `<TableCell>` in the same column have the exact same width class, and that the number/order of columns matches between header and body."

---

# ✅ Table Alignment Checklist

Before shipping or reviewing a table:

### 📐 Column Count & Order
- [ ] Headers and cells have the **same number and order**

### 📏 Width Classes
- [ ] Every `<TableHead>` and `<TableCell>` in the same column use the **same width class**
- [ ] If a width changes, it's updated **in both places**

### 🧱 Table Layout
- [ ] `table-fixed` is applied for consistent sizing

### 📌 Sticky Headers
- [ ] Header row uses `sticky top-0`

### 🧳 Overflow Handling
- [ ] Table is wrapped in a scroll container (`overflow-y-auto`, `max-h-*`)
- [ ] `overflow-x-auto` is considered for wide tables

### 🧼 Content Management
- [ ] Use `truncate`, `text-ellipsis`, or `break-words` as needed

### 🧩 Conditional Columns
- [ ] Headers and cells are conditionally rendered **together**

### 🧮 Scrollbar Compensation
- [ ] Consider padding or margin to offset vertical scrollbar in body

---

# 🧩 Reusable Table Snippet

```jsx
const columns = [
  { label: 'Name', width: 'w-32' },
  { label: 'Status', width: 'w-20' },
  { label: 'Date', width: 'w-32' },
];

<Table className="table-fixed w-full">
  <TableHeader>
    <TableRow>
      {columns.map((col) => (
        <TableHead key={col.label} className={col.width}>
          {col.label}
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((row, i) => (
      <TableRow key={i}>
        <TableCell className="w-32">{row.name}</TableCell>
        <TableCell className="w-20">{row.status}</TableCell>
        <TableCell className="w-32">{row.date}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 🔁 Template Rules
- Keep `columns` array as the source of truth
- Use the **same width** classes across header and body
- Update all widths/columns **in one place**

---

## Suggestions for AI Clarity

To reduce errors when modifying tables:
1. Use a `columns` config array as the **single source of truth**
2. Always **map from this array** to render both headers and cells
3. Avoid hardcoded `<TableCell>` structures unless absolutely necessary
4. Keep widths in variables/constants rather than duplicating strings
5. If columns are conditional, manage visibility via the `columns` array too (e.g., `visible: true/false`)

## 🎨 Table Row Hover Color & Borders

**Row Hover Color:**
- Always use your main brand color for row hover, as defined in your `globals.css`:
  - Example: `--main: oklch(84.08% 0.1725 84.2);`
- In Tailwind/JSX, apply with: `hover:bg-[var(--main)]`
- This ensures brand consistency and visual clarity.

**Example:**
```tsx
<TableRow className="hover:bg-[var(--main)]">
  {/* ... */}
</TableRow>
```

**Borders:**
- All tables should use a consistent pixel border (e.g., `border border-border` in Tailwind).
- This applies to the table container and, if needed, to cells for clear separation.

**Column Spacing:**
- Use `border-separate` and `border-spacing-x-2` (or your chosen value) on the `<Table>` for consistent horizontal spacing between columns.
- Do not use inconsistent padding or margin between columns.

**Example Table Setup:**
```tsx
<Table className="w-full table-fixed border-separate border-spacing-x-2 border border-border">
  <TableHeader>...</TableHeader>
  <TableBody>
    <TableRow className="hover:bg-[var(--main)]">...</TableRow>
  </TableBody>
</Table>
```

**Best Practices:**
- Never use hardcoded color values for hover; always reference your CSS variable.
- Keep border and spacing utilities consistent across all tables for a unified look.
