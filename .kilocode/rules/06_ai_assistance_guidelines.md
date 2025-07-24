# IMACX AI Assistance Guidelines

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