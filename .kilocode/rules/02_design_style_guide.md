# IMACX Design Style Guide

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