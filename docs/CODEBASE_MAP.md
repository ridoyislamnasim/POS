# Frontend Codebase Map

## Project Structure

```
frontend/
├── app/                          # Next.js App Router pages & layouts
├── components/                   # Shared UI components
├── lib/                          # Shared libraries & utilities
├── public/                       # Static assets
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

## App Router (`app/`)

| Path | Purpose |
|------|---------|
| `layout.tsx` | Root layout with theme boot, Providers |
| `providers.tsx` | QueryProvider > ThemeProvider > AppToaster > NavigationProgress |
| `page.tsx` | Redirects to /login |
| `template.tsx` | Wraps each page in QueryProvider |
| `globals.css` | Tailwind base, CSS variables, print styles |
| `login/page.tsx` | Login page |

### Feature Pages

| Directory | Route | Feature |
|-----------|-------|---------|
| `dashboard/` | `/dashboard` | Dashboard home |
| `pos/` | `/pos` | Point of Sale |
| `sales/` | `/sales` | Sales list + `[id]` detail |
| `returns/` | `/returns` | Returns list + `[id]` detail |
| `orders/` | `/orders` | Sales Orders |
| `products/` | `/products` | Products + `new/` + `[id]` |
| `categories/` | `/categories` | Categories |
| `subcategories/` | `/subcategories` | Subcategories |
| `brands/` | `/brands` | Brands |
| `units/` | `/units` | Units |
| `attributes/` | `/attributes` | Attributes + options |
| `barcodes/` | `/barcodes` | Barcode generator |
| `inventory/` | `/inventory` | Stock overview |
| `inventory/movements/` | `/inventory/movements` | Stock ledger |
| `receiving/` | `/receiving` | Purchase receipts |
| `damage/` | `/damage` | Damage reports |
| `customers/` | `/customers` | Customers + `[id]` |
| `loyalty/` | `/loyalty` | Loyalty points |
| `suppliers/` | `/suppliers` | Suppliers + `[id]` |
| `purchases/` | `/purchases` | Purchases |
| `purchase-orders/` | `/purchase-orders` | Purchase Orders |
| `expenses/` | `/expenses` | Expenses |
| `income/` | `/income` | Income |
| `payments/` | `/payments` | Payments |
| `dues/customers/` | `/dues/customers` | Customer dues |
| `dues/suppliers/` | `/dues/suppliers` | Supplier dues |
| `cash-flow/` | `/cash-flow` | Cash flow |
| `profit-loss/` | `/profit-loss` | Profit & Loss |
| `daily-closing/` | `/daily-closing` | Daily closing |
| `reports/` | `/reports` | Reports hub + `[kind]` |
| `users/` | `/users` | Users/employees CRUD |
| `roles/` | `/roles` | Roles & permissions |
| `attendance/` | `/attendance` | Attendance |
| `shifts/` | `/shifts` | Shift management |
| `audit/` | `/audit` | Audit log |
| `security/` | `/security` | Login security |
| `branches/` | `/branches` | Branches |
| `warehouses/` | `/warehouses` | Warehouses |
| `organization/` | `/organization` | Business profile |
| `subscription/` | `/subscription` | Subscription/billing + `requests/` |
| `integrations/` | `/integrations` | API/integration |
| `backup/` | `/backup` | Backup & restore |
| `settings/` | `/settings` | General settings |
| `import-export/` | `/import-export` | Import/export |
| `help/` | `/help` | Help center + `/role/` |
| `ecommerce/` | `/ecommerce` | E-commerce orders |
| `deliveries/` | `/deliveries` | Deliveries |
| `notifications/` | `/notifications` | Notifications |
| `sms/` | `/sms` | SMS settings |
| `billing/` | `/billing` | Billing (platform) |
| `platform/tenants/` | `/platform/tenants` | Tenant management |
| `platform/plans/` | `/platform/plans` | Plan management |
| `platform/access-requests/` | `/platform/access-requests` | Access requests |
| `platform/invoices/` | `/platform/invoices` | Platform invoices |

## Components (`components/`)

| Path | Purpose |
|------|---------|
| `app-shell.tsx` | Main layout wrapper (sidebar + top bar + content) |
| `app-nav.tsx` | Legacy top-level nav |
| `app-toaster.tsx` | Sonner toast container |
| `query-provider.tsx` | TanStack Query provider |
| `theme-provider.tsx` | Theme context |
| `theme-toggle.tsx` | Theme toggle button |
| `top-bar.tsx` | Legacy top bar (superseded by layout/) |
| `sidebar.tsx` | Legacy sidebar (superseded by layout/) |
| `confirm-dialog.tsx` | Confirmation dialog |
| `erp-page.tsx` | Generic CRUD resource page (used by ~15+ pages) |
| `navigation-progress.tsx` | Route transition progress bar |
| `app-shell.tsx` | Main layout with sidebar collapse, responsive design |

### Layout Components

| Path | Purpose |
|------|---------|
| `layout/app-sidebar.tsx` | Permission-filtered sidebar navigation |
| `layout/app-top-bar.tsx` | Breadcrumb, search, branch selector, notifications, user menu |

### UI Components (`components/ui/`)

17 shadcn/ui components: `button`, `card`, `dialog`, `dropdown-menu`, `input`, `table`, `table-pagination`, `badge`, `status-badge`, `avatar`, `data-table`, `list-frame`, `list-toolbar`, `icon-action-button`, `action-tooltip`, `info-tip`, `sidebar-tooltip`

### Domain Components

| Directory | Purpose |
|-----------|---------|
| `catalog/` | Product forms, barcode dialogs, image dropzone |
| `dashboard/` | Charts, KPI cards, widgets |
| `pos/` | POS customer picker |
| `help/` | Guided tours, help center, search, role guides |
| `ui/` | Re-exports + `PageHeader`, `Panel`, `Kpi`, `SummaryCards`, `EmptyState`, `ErrorState`, `Field`, `FiltersBar`, `Modal` |
| `access-request/` | Access request component |
| `plan/` | Plan/billing dialogs |
| `usage/` | Usage cards and upgrade prompt |
| `documents/` | Document handling |

## Libraries (`lib/`)

| File | Purpose |
|------|---------|
| `api.ts` | Core API client with CSRF, idempotency, error handling |
| `config.ts` | API URL configuration (single source of truth) |
| `auth.ts` | `useMe()`, `useProfile()`, `useUpdateProfile()`, `useChangePassword()` hooks |
| `query-client.ts` | React Query client setup |
| `nav-config.ts` | Navigation groups, page titles, metadata |
| `use-list-state.ts` | Server-side list state with URL sync |
| `use-pagination.ts` | Client-side pagination hooks |
| `use-debounce.ts` | Debounced state hook |
| `pos-store.ts` | Zustand POS cart store |
| `money.ts` | Currency calculations |
| `theme.ts` | Theme preference management |
| `sidebar-layout.ts` | Sidebar dimensions and animation constants |
| `navigation-progress.ts` | Route progress bar |
| `documents.ts` | Document printing/downloading |
| `print-barcodes.ts` | Barcode label printing |
| `toast.ts` | Toast notification utilities |
| `i18n.ts` | English/Bengali dictionaries |
| `cn.ts` | Tailwind class merging (`clsx` + `tailwind-merge`) |
| `cartesian.ts` | Cartesian product, SKU generation |
| `lookups.ts` | Generic lookup hooks |
| `stock-workflow.ts` | Return/damage/receipt constants |
| `utils.ts` | Re-exports `cn` |

### Help System (`lib/help/`)

| File | Purpose |
|------|---------|
| `index.ts` | Barrel re-exports |
| `catalog.ts` | Help pages, group blurbs |
| `tasks.ts` | Task guides |
| `tours.ts` | Guided tours |
| `roles.ts` | Role guides |
| `search.ts` | Help search |
| `storage.ts` | Help seen state |
| `types.ts` | Help type definitions |
| `use-help-create-action.ts` | Help create action hook |

## Key Patterns

### List Page Pattern
```typescript
const { rows, pagination, params, setParams } = useServerList({
  queryKey: ["products"],
  url: "/api/v1/products",
  columns: [...],
});
// Syncs search, page, limit, sort to URL query params
```

### CRUD Page Pattern
```typescript
<ResourcePage
  queryKey={["products"]}
  listUrl="/api/v1/products"
  entityName="Product"
  columns={[...]}
  form={<ProductForm />}
/>
```

### Data Fetching Pattern
```typescript
const { data, isLoading } = useQuery({
  queryKey: ["products", params],
  queryFn: () => api<ProductList>("/api/v1/products", { params }),
});
```

### Mutation Pattern
```typescript
const mutation = useMutation({
  mutationFn: (data) => api("/api/v1/products", { method: "POST", body: JSON.stringify(data) }),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toastSuccess("Created"); },
});
```

## Styling

- Tailwind CSS 3.4 with `cn()` utility (`clsx` + `tailwind-merge`)
- CSS custom properties for theming (`--background`, `--primary`, etc.)
- `darkMode: ["class"]` for dark mode
- Framer Motion for sidebar animations and page transitions
- shadcn/ui components for consistent UI
