# Frontend Business Rules

## Authentication & Authorization

- Login redirects based on role: Platform users → `/platform/tenants`, `TENANT_OWNER`/`report.view` → `/dashboard`, others → `/pos`
- `useMe()` auto-redirects to `/login` on 401 response
- `can(permission)` checks: `isPlatform` or `TENANT_OWNER` role → always true; otherwise checks `permissions` array
- Platform users see all tenants; tenant users see only their tenant
- Sidebar navigation items are filtered by `can(permission)` — items without matching permission are hidden
- `platformOnly` nav items only visible to platform users
- `ownerOnly` nav items only visible to `TENANT_OWNER`

## API Access

- All API calls go through `lib/config.ts` — no hardcoded backend URLs
- `NEXT_PUBLIC_APP_ENV` and `NEXT_PUBLIC_API_URL` are required env vars
- CSRF token (`pos_csrf`) automatically injected on every request
- `Idempotency-Key` header supported for safe retries on mutations
- `credentials: "include"` ensures cookies are sent with cross-origin requests
- API base URL: `NEXT_PUBLIC_API_URL` + `/api/v1`
- URL builder `buildApiUrl()` normalizes paths to prevent double `/api` prefixes

## POS (Point of Sale)

- `usePOSStore` (Zustand) manages the entire cart/session state
- Cart state includes: lines, payments, customer, locale, branch/register/device station, discounts, checkout key
- POS pages use `AppShell` with `pos` prop for tight layout (no padding)
- Discount > 10% requires `discount.approve` permission (enforced by backend)

## Navigation

- 14 nav groups with color-coded tones (emerald, amber, rose, lime, teal, yellow, stone, fuchsia)
- `NAV_GROUPS` defines all navigation items with permissions, platform flags, and tone
- `pageMeta()` maps paths to breadcrumb/title objects for the top bar
- Sidebar collapses to 48px on desktop, 212px on mobile (drawer)
- Collapse state persisted to localStorage (`pos_sidebar_collapsed`)

## Lists & Pagination

- `useServerList()` / `useServerEnvelope()` for server-side pagination
- All filter/search/pagination state synced to URL query params
- `keepPreviousData` prevents empty states during navigation
- Default page size: 25 items
- `usePagination()` provides `PAGE_SIZE_OPTIONS` and `DEFAULT_PAGE_SIZE`

## Money & Calculations

- `lib/money.ts` mirrors backend `decimal.js` calculations
- Same locked rounding order: unit → line discount → taxable → tax → line round → invoice total
- `roundMoney()` formats to fixed decimal places
- Never use native JavaScript floats for money

## Documents & Printing

- `lib/documents.ts` handles printing and downloading
- Uses iframe-based printing with HTML caching
- `printPosDocument()` and `downloadPosDocument()` for POS receipts/invoices
- `documentUrl()` generates document URLs

## Notifications & Toasts

- `lib/toast.ts` provides `toastSuccess`, `toastError`, `toastInfo`, `toastWarn`, `toastCreated`, `toastDeleted`, `toastUpdated`, `toastPos`
- `CODE_HINTS` maps error codes to user-friendly messages
- Toast deduplication prevents repeated identical toasts
- `AppToaster` component renders toasts via Sonner

## Theme

- Three themes: light, dark, system
- Persists preference to localStorage (`pos_theme`)
- `ThemeProvider` wraps the entire app
- Theme boot script in `layout.tsx` prevents flash of wrong theme

## Responsive Behavior

- Desktop (≥992px): Sidebar toggleable between expanded (168px) and collapsed (48px)
- Mobile (<992px): Sidebar as overlay drawer (212px) with hamburger menu
- `AppShell` handles resize events and mobile drawer close on navigation
- Print styles: sidebar hidden, content displayed full-width

## Profile

- `/profile` page shows user info (name, email, locale, avatar) and allows editing name/avatar
- `useProfile()` fetches `/api/v1/auth/profile` and caches in TanStack Query
- `useUpdateProfile()` handles `PATCH /api/v1/auth/profile` with optimistic updates
- `useChangePassword()` handles `POST /api/v1/auth/change-password` with current password validation
- Top-bar user dropdown has "Profile" and "Change Password" menu items
- Avatar upload uses base64 data URL → `POST /api/v1/auth/profile/image`

## Access Paused State

- When tenant's `apiAccessEnabled` is `false`, `AppShell` shows "Access paused" banner
- Banner shown on all pages except `/subscription` and `/billing`
- Links to `/billing` for invoice payment
- Message comes from `me.lockMessage` from backend
