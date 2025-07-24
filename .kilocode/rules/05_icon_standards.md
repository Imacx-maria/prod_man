# IMACX Icon Standards

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