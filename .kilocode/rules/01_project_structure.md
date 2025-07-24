# IMACX Project Structure

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