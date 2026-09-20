# Frontend Architecture

## Overview

Next.js 15 App Router with server-side rendering, TanStack Query for state management, and a permission-driven navigation system.

## Request Flow

```
User clicks link / types URL
  → Next.js App Router resolves page.tsx
    → AppShell renders (sidebar + top bar + content)
      → useMe() fetches /api/v1/auth/me (TanStack Query)
      → Page component uses useQuery/useMutation
        → lib/api.ts fetch wrapper
          → Backend REST API (/api/v1/*)
            → Express middleware chain
              → Controller → Service → Repository → Prisma → PostgreSQL
```

## Provider Hierarchy

```html
<html>
  <body>
    <Providers>                          <!-- app/providers.tsx -->
      <QueryProvider>                    <!-- TanStack Query v5 -->
        <ThemeProvider>                  <!-- light/dark/system -->
          {children}
          <AppToaster />                 <!-- Sonner toasts -->
          <NavigationProgress />         <!-- Route progress bar -->
        </ThemeProvider>
      </QueryProvider>
    </Providers>
  </body>
</html>
```

## Page Layout Structure

Every authenticated page follows this pattern:

```
AppShell
  ├── AppSidebar (left navigation)
  │     └── NAV_GROUPS filtered by user permissions
  ├── AppTopBar (breadcrumb, search, notifications, user)
  └── Main Content
        ├── PageHeader / Panel / KPI cards
        ├── DataTable / ResourcePage / custom components
        └── useQuery hooks for data fetching
```

## Auth Flow

1. **Login** (`/login`): POST credentials → backend returns JWT cookies → redirect based on role
2. **`useMe()`**: Fetches `/api/v1/auth/me`, caches in TanStack Query
3. **Auto-redirect**: 401 response → `router.replace("/login")`
4. **Sign out**: POST `/api/v1/auth/logout` → clears query cache → redirect to login
5. **Permission checks**: `can("permission.key")` checks `isPlatform`, `TENANT_OWNER`, or `permissions` array
6. **Profile**: `useProfile()` fetches `/api/v1/auth/profile`; `useUpdateProfile()` and `useChangePassword()` handle writes; `/profile` page has profile form and change password form; top-bar dropdown has Profile and Change Password menu items

## Navigation System

- **`NAV_GROUPS`** in `lib/nav-config.ts`: 14 groups, ~90+ items
- Each item has: `name`, `path`, `permission`, `platformOnly`, `ownerOnly`, `tone`
- **`filterNavGroups(can, { isPlatform, isOwner })`**: Filters items by user permissions
- **Sidebar**: Collapsible, mobile drawer, localStorage persistence for collapse state
- **Page titles**: `pageMeta()` maps paths to breadcrumb/title objects

## State Management

- **Server state**: TanStack Query v5 with `QueryClient` (retry: 1, refetchOnWindowFocus: false)
  - Browser: singleton client
  - Server: fresh instance per request
- **Client state**: Zustand (`usePOSStore`) for POS cart, payments, customer, discounts
- **Theme**: React Context with localStorage persistence

## API Client Pattern

```typescript
// All API calls go through lib/api.ts
const data = await api<MyType>("/api/v1/resource", {
  method: "POST",
  body: JSON.stringify(payload),
  idempotencyKey: "uuid", // optional
});
```

- CSRF token automatically injected from `pos_csrf` cookie
- `Idempotency-Key` header for safe retries
- `credentials: "include"` for cookies
- Errors throw with `{ code, message, status }`

## Responsive Design

- Desktop: Sidebar expanded (168px) or collapsed (48px)
- Mobile: Sidebar as drawer (212px) with overlay
- Breakpoint: 992px

## Error Handling

- `api.ts` throws `Error` with `code` and `status` properties on failure
- Toast notifications via `toastSuccess`, `toastError`, etc.
- Error code hints in `lib/toast.ts` (`CODE_HINTS`) for user-friendly messages
- `AppShell` shows "Access paused" banner when tenant API access is disabled
