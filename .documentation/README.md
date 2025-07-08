# Project Documentation

## Overview
This project is a Next.js application with a modular structure, robust feature set, and a focus on maintainability, type safety, and testability. It includes a variety of business features, reusable UI components, custom hooks, utilities, and a comprehensive testing setup.

---

## 1. App Structure (`src/app/`)
- **Main Routing & Layout**
  - `layout.tsx`, `globals.css`, `page.tsx`: Global layout, styles, and root page.
- **Feature Folders**
  - **Dashboard**: `/dashboard/` (main, change-password, profile)
  - **Authentication**: `/login/`, `/reset-password/`, `/update-password/`
  - **Payments**: `/payments/` (data-table, columns)
  - **Producao**: `/producao/` (main production logic)
  - **Designer Flow**: `/designer-flow/` (main designer logic)
  - **Definições**: `/definicoes/` (armazens, clientes, complexidade, feriados, maquinas, materiais, transportadoras, utilizadores)
    - Each subfolder has a `page.tsx` implementing the feature.
  - **API Routes**: `/api/`
    - **Admin**: `/admin/roles/`, `/admin/profiles/`, `/admin/users/`
    - **Auth**: `/auth/callback/`
    - **Message**: `/message/`
  - **Test Examples**: `/test-examples/` (demo/test pages and components)
  - **Test Env**: `/test-env/` (reserved for environment-specific tests)

---

## 2. Components (`src/components/`)
- **UI Components**: Buttons, tables, drawers, dialogs, navigation, comboboxes, calendar, etc.
- **Feature Components**: LogisticaTable, DashboardLogisticaTable, ClientDashboardShell, etc.
- **Demo Components**: `*-demo.tsx` files for showcasing UI elements.
- **UI Primitives**: `/ui/` subfolder (badge, button, calendar, card, checkbox, combobox, etc.)
- **Examples**: `/examples/` (e.g., CreatableComboboxExample)
- **Production**: `/production/` (production-specific components)

---

## 3. Hooks (`src/hooks/`)
- Custom React hooks for:
  - Authentication (`useAuth`)
  - Data fetching and updates (`useJobUpdater`, `useGetMessage`)
  - UI logic (`useDrawerContentRef`, `useDrawerFocus`, `useDebounce`, `useComplexidades`)

---

## 4. Utilities (`src/utils/`)
- **Data and Logic Helpers**: `useLogisticaData`, `useLogisticaFilters`, `exportLogisticaToExcel`, `date`, `accessibility`, `supabase`, `tailwind`

---

## 5. Types (`src/types/`)
- **TypeScript Types**: `logistica.ts` (domain-specific types)

---

## 6. Providers (`src/providers/`)
- **Context Providers**: Accessibility, Theme, React Query

---

## 7. Mocks (`src/mocks/`)
- **Mock Service Worker Setup**: For API mocking in development/testing

---

## 8. Testing
- **Test Utilities**: `src/test/test-utils.tsx`
- **Top-Level Tests Folder (`/tests/`)**
  - **Component Tests**: `/components/StopInDrawer.test.tsx`
  - **Playwright E2E Tests**: `/playwright/drawer-popover.spec.ts`
  - **Test Setup**: `/test-utils/setupTests.ts`

---

## 9. Other Notable Files
- **Middleware**: `src/middleware.ts` (Next.js middleware logic)
- **Configuration**: `jest.config.js`, `tailwind.config.js`, `next.config.js`, etc.
- **Public Assets**: `/public/` (icons, images, mockServiceWorker.js)
- **Database/SQL**: `/supabase/functions/update_item_complexity.sql`, `migration.sql`
- **Temporary/Test Files**: `test-db.html`, `test-db.js`, `temp_env.txt`

---

## Summary of What's Done
- Core app structure is in place, following Next.js conventions.
- Feature pages for dashboard, authentication, payments, production, designer flow, and definitions (armazens, clientes, etc.) are implemented.
- Reusable UI components and primitives are available and organized.
- Custom hooks and utility functions support business and UI logic.
- API routes for admin, auth, and messaging are scaffolded.
- Testing is set up with dedicated folders for unit, integration, and E2E tests.
- Mocking and test utilities are present for robust testing.
- TypeScript types and context providers are implemented for type safety and state management.
- Configuration for Jest, Tailwind, and Next.js is present.
- Public assets and database scripts are included.

---

## Feature: Dashboard

**Location:**  
- `src/app/dashboard/`
  - `page.tsx` (main dashboard page)
  - `layout.tsx` (dashboard layout)
  - `change-password/page.tsx` (change password page)
  - `profile/page.tsx` (user profile page)

### Purpose
The Dashboard module provides users with a central hub for accessing their profile, changing their password, and viewing key information relevant to their account or role. It acts as the main entry point after authentication and is designed for quick access to personal and administrative features.

### Usage
- **Access:**  
  Users are typically redirected to the dashboard after logging in.
- **Navigation:**  
  The dashboard layout provides navigation to:
  - Main dashboard overview (`/dashboard`)
  - Change password (`/dashboard/change-password`)
  - Profile management (`/dashboard/profile`)

### Main Components & Pages
- **Dashboard Main Page (`page.tsx`):**
  - Displays user-specific or role-specific information.
  - May include widgets, summaries, or quick links (details depend on implementation).
- **Change Password (`change-password/page.tsx`):**
  - Allows users to securely update their password.
  - Includes form validation and feedback.
- **Profile (`profile/page.tsx`):**
  - Displays and allows editing of user profile information.
  - May include avatar, contact info, and other personal details.

### Extensibility
- The dashboard is structured to allow easy addition of new sections or widgets.
- Sub-pages can be added under `/dashboard/` for new features.

### Key File: Main Dashboard Page (`src/app/page.tsx`)

This file is the main entry point for the IMACX Dashboard. It is responsible for:

- **SEO Metadata:** Sets the dashboard's title, description, and keywords for search optimization.
- **Holiday Data Fetching:** Implements a server-side function to fetch current and future holidays from the database (with fallback test data for robustness).
- **Revalidation:** Uses Next.js revalidation to keep holiday data fresh (every hour).
- **User Authentication:** Checks if the user is authenticated with Supabase; if not, prompts connection steps.
- **Dashboard Rendering:**
  - If authenticated, renders the main dashboard shell (`ClientDashboardShell`) with holiday data and widgets.
  - If not authenticated, renders connection instructions (`ConnectSupabaseSteps`).
- **Accessibility:** Wraps the dashboard in an accessibility-focused component for improved UX.
- **Loading State:** Provides a skeleton loader for a smooth user experience during data fetching.

This page acts as the operational and informational hub for users, integrating data, authentication, and UI in a single, maintainable entry point.

---

## Feature: Produção

**Location:**  
- `src/app/producao/`
  - `page.tsx` (main production page)

### Purpose
The Produção (Production) module manages and displays production-related data and workflows. It is designed to support operational processes, visualize production status, and facilitate management of production tasks or items.

### Usage
- **Access:**  
  Users can access the production dashboard via `/producao`.
- **Functionality:**  
  The page provides tools and views for monitoring, updating, and managing production activities. The specifics depend on the business logic implemented in `page.tsx`.

### Main Components & Pages
- **Produção Main Page (`page.tsx`):**
  - Centralizes all production-related operations and data.
  - May include tables, charts, forms, and controls for interacting with production records.
  - Handles business logic for production workflows.

### Extensibility
- The production module is implemented as a single page but can be expanded with sub-pages or additional components as production requirements grow.
- Integrates with other modules (e.g., definitions, dashboard) as needed for data and workflow continuity.

---

## Feature: Designer Flow

**Location:**  
- `src/app/designer-flow/`
  - `page.tsx` (main designer flow page)

### Purpose
The Designer Flow module provides a visual or interactive interface for designing, configuring, or managing workflows, processes, or layouts. It is intended for users who need to create or modify complex flows, such as process diagrams, automation pipelines, or custom configurations.

### Usage
- **Access:**  
  Users can access the designer flow via `/designer-flow`.
- **Functionality:**  
  The page offers tools for building, editing, and visualizing flows. This may include drag-and-drop interfaces, node/edge editing, and real-time feedback, depending on the implementation in `page.tsx`.

### Main Components & Pages
- **Designer Flow Main Page (`page.tsx`):**
  - Hosts the core designer interface.
  - Provides controls for adding, removing, and configuring elements of a flow.
  - May include a canvas, toolbox, property panels, and preview features.

### Extensibility
- The designer flow is implemented as a single page but can be extended with additional panels, modals, or sub-pages for advanced features.
- Designed to integrate with other modules (e.g., production, definitions) for data input/output or workflow automation.

---

## Feature: Authentication

**Location:**  
- `src/app/login/` (login page and layout)
- `src/app/reset-password/` (reset password page and layout)
- `src/app/update-password/` (update password page and layout)
- `src/app/api/auth/` (API routes for authentication)
- `src/hooks/useAuth.ts` (authentication hook)
- `src/components/AuthButton.tsx`, `src/components/AuthDropdown.tsx`, `src/components/ClientAuthButton.tsx` (auth UI components)

### Purpose
The Authentication module manages user sign-in, password reset, and session management. It ensures secure access to the application and provides a user-friendly interface for authentication-related actions.

### Usage
- **Login:**  
  Users access `/login` to sign in. The login page provides a form or third-party authentication options.
- **Password Reset:**  
  Users who forget their password can initiate a reset via `/reset-password`.
- **Password Update:**  
  Authenticated users can update their password via `/update-password`.
- **Session Management:**  
  Authentication state is managed via Supabase and custom hooks/components, ensuring protected routes and session persistence.

### Main Components & Pages
- **Login Page (`login/page.tsx`):**
  - Handles user sign-in and error feedback.
- **Reset Password Page (`reset-password/page.tsx`):**
  - Allows users to request a password reset link.
- **Update Password Page (`update-password/page.tsx`):**
  - Enables users to set a new password after verification.
- **API Routes (`api/auth/`):**
  - Backend endpoints for handling authentication callbacks and logic.
- **Auth Components:**
  - `AuthButton`, `AuthDropdown`, `ClientAuthButton` provide UI for login/logout and user session display.
- **Auth Hook:**
  - `useAuth` manages authentication state and provides helper functions for login, logout, and user info.

### Extensibility
- The authentication system is modular and can be extended to support additional providers, multi-factor authentication, or custom flows.
- Auth logic is separated into hooks and components for easy reuse and testing.

---

## Feature: Definições (Database Data Management)

**Location:**  
- `src/app/definicoes/`
  - `armazens/` (warehouses)
  - `clientes/` (clients)
  - `complexidade/` (complexity levels)
  - `feriados/` (holidays)
  - `maquinas/` (machines)
  - `materiais/` (materials)
  - `transportadoras/` (carriers)
  - `utilizadores/` (users)
  - Each subfolder contains a `page.tsx` implementing the management UI for that entity.

### Purpose
The Definições module is the central place for managing all core database data entities. It provides CRUD (Create, Read, Update, Delete) interfaces for business-critical tables, allowing administrators and power users to maintain the foundational data that powers the rest of the application.

### Usage
- **Access:**  
  Users with appropriate permissions can access each entity management page via `/definicoes/{entity}` (e.g., `/definicoes/armazens`).
- **Functionality:**  
  Each page provides tools for listing, searching, creating, editing, and deleting records in the corresponding database table.
- **Entities Managed:**
  - **Armazens:** Manage warehouse locations and details.
  - **Clientes:** Manage client/customer records.
  - **Complexidade:** Define and edit complexity levels for operations or products.
  - **Feriados:** Maintain the list of holidays affecting operations.
  - **Maquinas:** Manage machine inventory and details.
  - **Materiais:** Manage materials and inventory items.
  - **Transportadoras:** Manage logistics carriers and partners.
  - **Utilizadores:** Manage user accounts, roles, and permissions.

### Main Components & Pages
- Each entity has its own `page.tsx` implementing:
  - Data tables with search and filter capabilities.
  - Forms for adding and editing records.
  - Actions for deleting or updating entries.
  - Integration with backend APIs or direct database access via Supabase.

### Extensibility
- New entities can be added by creating a new subfolder and `page.tsx` under `/definicoes/`.
- Existing pages can be extended with additional fields, validation, or business logic as requirements evolve.
- Designed for modularity and ease of maintenance, supporting scalable data management as the application grows.

---

## Next Steps
- Add README sections for each major feature (dashboard, producao, designer-flow, etc.) with usage and purpose.
- Document API endpoints (routes, expected payloads, responses).
- Add JSDoc/TSDoc comments to complex utilities, hooks, and components.
- Maintain a changelog for major updates.
- Consider auto-generating component and API docs using tools like Storybook or Typedoc. 