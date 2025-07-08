# SimpleNotasPopover with Tooltip Implementation

This document describes how to properly implement the `SimpleNotasPopover` component with tooltip functionality to show the notes content on hover.

## Required Imports

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SimpleNotasPopover from '@/components/ui/SimpleNotasPopover'
```

## Implementation Pattern

Use this exact pattern to implement SimpleNotasPopover with tooltip functionality:

```typescript
<TableCell className="text-center">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <SimpleNotasPopover
            value={data.notas || ''}
            onSave={async (newNotas) => {
              await updateFunction(data.id, 'notas', newNotas);
            }}
            placeholder="Adicionar notas..."
            label="Notas"
            buttonSize="icon"
            className="mx-auto aspect-square"
            disabled={false}
          />
        </div>
      </TooltipTrigger>
      {data.notas && data.notas.trim() !== '' && (
        <TooltipContent>
          {data.notas}
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

## Key Components Explained

### 1. TooltipProvider
- Wraps the entire tooltip implementation
- Provides context for the tooltip system

### 2. Tooltip
- The main tooltip component that handles the show/hide logic

### 3. TooltipTrigger with asChild
- `asChild` prop is **crucial** - it allows the tooltip to merge with the child component
- Contains a wrapping `<div>` that serves as the hover target

### 4. SimpleNotasPopover
- The actual notes editing component
- Must be wrapped in a `<div>` inside the TooltipTrigger

### 5. Conditional TooltipContent
- Only renders when there are actual notes to display
- Uses the condition: `data.notas && data.notas.trim() !== ''`

## Why This Structure Works

1. **Avoids Conflicts**: The wrapping div prevents conflicts between the Popover and Tooltip event handling
2. **Proper Event Delegation**: The `asChild` prop allows the tooltip to properly attach to the wrapped component
3. **Conditional Display**: Tooltip only appears when there's content to show
4. **Consistent Behavior**: Works reliably across different contexts (main tables, drawers, etc.)

## Common Mistakes to Avoid

❌ **Don't do this:**
```typescript
// Missing wrapping div
<TooltipTrigger asChild>
  <SimpleNotasPopover ... />
</TooltipTrigger>

// Missing asChild prop
<TooltipTrigger>
  <div>...</div>
</TooltipTrigger>

// Using native title attribute instead of Tooltip component
<div title={notes}>
  <SimpleNotasPopover ... />
</div>
```

✅ **Always do this:**
```typescript
<TooltipTrigger asChild>
  <div>
    <SimpleNotasPopover ... />
  </div>
</TooltipTrigger>
```

## Example Usage in Different Contexts

### In a Table Cell
```typescript
<TableCell className="text-center">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <SimpleNotasPopover
            value={job.notas ?? ''}
            onSave={async (newNotas) => {
              await supabase.from('folhas_obras').update({ notas: newNotas }).eq('id', job.id);
              setJobs(prev => prev.map(j => j.id === job.id ? { ...j, notas: newNotas } : j));
            }}
            placeholder="Adicionar notas..."
            label="Notas"
            buttonSize="icon"
            className="mx-auto aspect-square"
            disabled={false}
          />
        </div>
      </TooltipTrigger>
      {job.notas && job.notas.trim() !== '' && (
        <TooltipContent>
          {job.notas}
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

### In a Toolbar/Header
```typescript
<div className="h-9 flex items-center">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <SimpleNotasPopover
            value={data.notas ?? ''}
            onSave={async (newNotas) => {
              await updateNotes(data.id, newNotas);
            }}
            placeholder="Adicionar notas..."
            label="Notas"
            buttonSize="icon"
            className="h-9 w-9"
            disabled={false}
          />
        </div>
      </TooltipTrigger>
      {data.notas && data.notas.trim() !== '' && (
        <TooltipContent>
          {data.notas}
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
</div>
```

## Tested Contexts

This implementation has been successfully tested and works in:
- ✅ Main production tables
- ✅ Drawer components  
- ✅ Tables with Select components (using `disablePortal`)
- ✅ Nested component structures

## Notes

- The tooltip will only appear when hovering over the SimpleNotasPopover button if there are notes to display
- The conditional rendering prevents empty tooltips from appearing
- This pattern is consistent with the shadcn/ui design system
- Works properly with the existing `SimpleNotasPopover` component without modifications 