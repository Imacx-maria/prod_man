# Role-Based Access Control (RBAC) Implementation

This document describes the role-based access control system implemented in the application, which allows administrators to control which pages different user roles can access.

## Overview

The RBAC system consists of:
1. **Database table** for storing role permissions
2. **API endpoints** for managing permissions
3. **React hooks** for checking permissions
4. **UI components** for managing permissions
5. **Navigation filtering** to hide unauthorized menu items
6. **Page protection** to redirect unauthorized users

## Database Schema

### New Table: `role_permissions`

```sql
CREATE TABLE public.role_permissions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  can_access boolean DEFAULT true,
  created_at date DEFAULT CURRENT_DATE,
  updated_at date DEFAULT CURRENT_DATE,
  UNIQUE(role_id, page_path)
);
```

The table stores which pages each role can access. Each row represents a permission for a specific role to access a specific page path.

## Default Role Permissions

Based on your requirements, the following default permissions are configured:

### ALL USERS (Basic Access)
- `/` - Homepage
- `/login` - Login page  
- `/reset-password` - Reset password
- `/update-password` - Update password
- `/dashboard` - Main dashboard
- `/dashboard/profile` - User profile
- `/dashboard/change-password` - Change password

### ADMIN (Full Access)
- Has access to **all pages** in the system

### PRODUCAO Role
- All basic pages +
- All Definições pages (`/definicoes/*`)
- `/producao` - Main production page
- `/producao/operacoes` - Production operations  
- `/designer-flow` - Designer workflow

### ADMINISTRATIVO Role  
- All basic pages +
- All Definições pages (`/definicoes/*`)
- `/producao` - Main production page (read-only)

### OPERADOR Role
- All basic pages +
- `/producao/operacoes` - Production operations only

### DESIGNERS Role
- All basic pages +
- `/designer-flow` - Designer workflow only

## Components and Files Created

### 1. Database Migration
- `supabase/migrations/20241229_create_role_permissions.sql`
  - Creates the `role_permissions` table
  - Sets up RLS policies
  - Seeds default permissions for existing roles

### 2. API Endpoints
- `src/app/api/admin/role-permissions/route.ts`
  - `GET` - Fetch permissions for a role
  - `PUT` - Update permissions for a role  
  - `POST` - Initialize permissions for new roles

### 3. React Hook
- `src/hooks/usePermissions.ts`
  - Fetches user permissions on login
  - Provides helper functions to check page access
  - Filters menu items based on permissions

### 4. Permission Guard Component
- `src/components/PermissionGuard.tsx`
  - Wraps page content to check access
  - Redirects unauthorized users
  - Shows loading state while checking

### 5. Permissions Management UI
- `src/components/RolePermissionsDrawer.tsx`
  - Drawer interface for managing role permissions
  - Grouped by page categories
  - Checkboxes for each page with descriptions

### 6. Updated Components
- `src/app/definicoes/utilizadores/page.tsx` - Added permissions button to roles table
- `src/components/menubar-demo.tsx` - Added permission filtering to navigation
- `src/app/definicoes/armazens/page.tsx` - Example of protected page

## How to Use

### 1. Run the Migration

```bash
npx supabase db push
```

This will create the `role_permissions` table and seed it with default permissions.

### 2. Manage Role Permissions

1. Go to `/definicoes/utilizadores`
2. Click on the "Papéis" tab
3. Click the **Settings** icon (⚙️) next to any role
4. Check/uncheck pages the role should have access to
5. Click "Guardar Permissões"

### 3. Protect Pages

Wrap any page content with the `PermissionGuard` component:

```tsx
import PermissionGuard from '@/components/PermissionGuard'

export default function MyProtectedPage() {
  return (
    <PermissionGuard>
      <div>
        {/* Your page content */}
      </div>
    </PermissionGuard>
  )
}
```

### 4. Check Permissions in Components

Use the `usePermissions` hook to check access programmatically:

```tsx
import { usePermissions } from '@/hooks/usePermissions'

export default function MyComponent() {
  const { canAccessPage, hasRole } = usePermissions()
  
  return (
    <div>
      {canAccessPage('/admin/settings') && (
        <Button>Admin Settings</Button>
      )}
      {hasRole('ADMIN') && (
        <div>Admin-only content</div>
      )}
    </div>
  )
}
```

## Permission Checking Flow

1. **User logs in** → `usePermissions` hook fetches their role and permissions
2. **User navigates** → `PermissionGuard` checks if they can access the page
3. **Navigation renders** → Menu items are filtered based on permissions  
4. **Unauthorized access** → User is redirected to dashboard with warning

## Navigation Filtering

The navigation (`menubar-demo.tsx`) automatically hides menu items that users cannot access:

- **Single menu items** are hidden if the user lacks permission
- **Dropdown menus** are hidden if all items are inaccessible  
- **Dropdown items** within accessible menus are individually filtered

## Adding New Pages

When adding new pages to the system:

1. **Add to API** - Update the `availablePages` array in `/api/admin/role-permissions/route.ts`
2. **Add to Migration** - Include the new page path in the migration's INSERT statement
3. **Add to Drawer** - Update `PAGE_CATEGORIES` in `RolePermissionsDrawer.tsx`
4. **Add to Navigation** - Update `MENU_STRUCTURE` in `menubar-demo.tsx` if needed
5. **Protect Page** - Wrap the page component with `PermissionGuard`

## Security Considerations

- **Client-side only** - This implementation uses client-side permission checking for UX
- **Server-side validation** - Add server-side permission checks for sensitive API endpoints
- **RLS policies** - Database-level security is handled by existing Supabase RLS policies
- **Token validation** - User authentication is handled by Supabase Auth

## Troubleshooting

### Permission Changes Not Reflecting
- The `usePermissions` hook caches permissions for performance
- Log out and log back in to refresh permissions
- Or use the `refresh()` function from the hook

### Navigation Items Not Hiding
- Check that `canAccessPage()` is returning the expected boolean
- Verify the page path matches exactly in the database
- Check browser console for any JavaScript errors

### Pages Not Redirecting
- Ensure `PermissionGuard` is wrapping the page content
- Check that the user has a valid profile with a role assigned
- Verify the `useAuth` hook is providing user data correctly

## Example Usage

```tsx
// Protect an entire page
export default function AdminPage() {
  return (
    <PermissionGuard requiredPath="/admin" fallbackPath="/dashboard">
      <AdminContent />
    </PermissionGuard>
  )
}

// Check permissions in a component
function UserMenu() {
  const { canAccessPage, hasRole } = usePermissions()
  
  return (
    <Menu>
      <MenuItem href="/profile">Profile</MenuItem>
      {canAccessPage('/admin') && (
        <MenuItem href="/admin">Admin Panel</MenuItem>
      )}
      {hasRole('ADMIN') && (
        <MenuItem href="/system-logs">System Logs</MenuItem>
      )}
    </Menu>
  )
}

// Filter menu items dynamically
function DynamicMenu({ menuItems }) {
  const { filterMenuItems } = usePermissions()
  const accessibleItems = filterMenuItems(menuItems)
  
  return (
    <nav>
      {accessibleItems.map(item => (
        <Link key={item.path} href={item.path}>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

This RBAC system provides a flexible, user-friendly way to control access to different parts of your application while maintaining a clean separation between roles and permissions. 