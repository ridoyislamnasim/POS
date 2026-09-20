# Frontend AGENTS.md

## Project Overview

Next.js 15 + React 19 + TypeScript + Tailwind CSS POS frontend. Uses TanStack Query v5 and Zustand for state management. Shadcn/ui components with Framer Motion animations.

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript 5.8
- Tailwind CSS 3.4
- TanStack Query v5
- Zustand (POS cart store)
- Framer Motion (animations)
- shadcn/ui components
- Radix UI (dialogs, dropdowns)
- Sonner (toasts)
- Recharts (dashboard charts)
- Lucide React (icons)

## Architecture

```
Page Component (app/*/page.tsx)
  → AppShell (components/app-shell.tsx)
    → AppSidebar (permission-filtered nav)
    → AppTopBar (breadcrumb, notifications, user menu)
    → Page Content (useQuery/useMutation)
      → lib/api.ts (fetch wrapper)
        → Backend REST API (/api/v1/*)

State:
  QueryClient (TanStack Query) — server-state caching
  usePOSStore (Zustand) — POS cart/session state
  ThemeProvider — light/dark/system theme
```

## Key Files

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, theme boot script |
| `app/providers.tsx` | Provider hierarchy: QueryProvider > ThemeProvider > AppToaster > NavigationProgress |
| `app/page.tsx` | Redirects to /login |
| `app/login/page.tsx` | Login page |
| `app/template.tsx` | Wraps each page in QueryProvider |
| `components/app-shell.tsx` | Main layout wrapper with sidebar, top bar, content area |
| `components/layout/app-sidebar.tsx` | Permission-filtered navigation sidebar |
| `components/layout/app-top-bar.tsx` | Top bar with breadcrumb, search, notifications |
| `components/erp-page.tsx` | Generic CRUD resource page |
| `components/ui.tsx` | Re-exports all UI components + page layout components |
| `lib/api.ts` | Core API client (CSRF, idempotency, error handling) |
| `lib/auth.ts` | `useMe()` hook, `can(permission)` |
| `lib/query-client.ts` | React Query client configuration |
| `lib/nav-config.ts` | Navigation groups, page titles, breadcrumbs |
| `lib/use-list-state.ts` | Server-side list state with URL query sync |
| `lib/use-pagination.ts` | Client-side pagination hooks |
| `lib/pos-store.ts` | Zustand POS cart store |
| `lib/config.ts` | API URL configuration (single source of truth) |
| `lib/money.ts` | Currency calculations (mirrors backend) |
| `lib/toast.ts` | Toast notification utilities |
| `lib/i18n.ts` | English/Bengali dictionaries |
| `lib/theme.ts` | Theme preference management |
| `lib/sidebar-layout.ts` | Sidebar dimensions and animation constants |
| `lib/navigation-progress.ts` | Route transition progress bar |
| `lib/documents.ts` | Document printing/downloading |
| `lib/help/` | Help system (guided tours, tasks, search) |
| `app/profile/page.tsx` | Profile page (view/edit info, change password) |

## Coding Patterns

- **Page components**: Use `AppShell` wrapper, `useQuery` for data, `useMutation` for writes
- **List pages**: Use `useServerList()` or `useServerEnvelope()` from `lib/use-list-state.ts`
- **CRUD pages**: Use `ResourcePage` component from `components/erp-page.tsx`
- **API calls**: Use `api<T>(path, init)` from `lib/api.ts` — never raw `fetch`
- **Auth**: Use `useMe()` hook for current user, `useProfile()`, `useUpdateProfile()`, `useChangePassword()` for profile features
- **Navigation**: Uses `NAV_GROUPS` from `lib/nav-config.ts` — sidebar auto-filters by permissions
- **Forms**: Zod validation on backend, React Hook Form on frontend
- **Toasts**: Use `toastSuccess`, `toastError`, etc. from `lib/toast.ts`
- **Theme**: Light/dark/system via `ThemeProvider`, persists to localStorage
- **Profile**: `/profile` route uses `useProfile()`, `useUpdateProfile()`, `useChangePassword()` hooks; top-bar dropdown has Profile and Change Password menu items

## Testing

- No dedicated test files for frontend components
- Type-check with `tsc`
- Build with `pnpm build`

## Important Constraints

- All API URLs go through `lib/config.ts` — never hardcode backend URLs
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_ENV` are required env vars
- CSRF token (`pos_csrf`) is automatically injected by `api.ts`
- Idempotency keys are automatically added to mutations via `api.ts`
- Sidebar navigation is permission-filtered — only visible items for the user's role
- The `useMe()` hook auto-redirects to `/login` on 401 responses
