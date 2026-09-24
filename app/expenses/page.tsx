"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, LayoutGrid, LayoutList, Pencil, Plus, Trash2, Tag, X } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { useMe } from "@/lib/auth";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingSkeleton,
  TablePagination,
  TableRow,
  TableToolbar,
  tableCellActions,
  tableCellNumeric,
  inputClass,
  SearchInput,
  DateRangeFilter,
  FilterSelect,
  FilterChips,
  StatusBadge,
  SummaryCards,
  IconActionButton,
} from "@/components/ui";
import { toastCreated, toastDeleted, toastError, toastUpdated } from "@/lib/toast";
import { emptyHintFor } from "@/lib/help";

type Category = { id: string; name: string; parentId: string | null };
type ExpenseRow = {
  id: string;
  categoryId: string;
  category?: { id: string; name: string };
  subtotal?: string;
  taxAmount?: string;
  totalAmount?: string;
  amount: string;
  tax?: string;
  taxRecoverable?: boolean;
  method: string;
  paymentAccountId?: string | null;
  vendor?: string | null;
  vendorId?: string | null;
  notes?: string | null;
  branchId?: string | null;
  branch?: { name: string } | null;
  status: string;
  businessDate: string;
  createdAt: string;
};

function moneyText(v: unknown) {
  const n = Number(v ?? 0);
  return `৳ ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}
function moneyCell(v: unknown) {
  return <span className="tabular-nums">{moneyText(v)}</span>;
}
function statusBadge(v: unknown) {
  return <StatusBadge value={v} />;
}
function sumField(rows: ExpenseRow[], key: string) {
  return rows.reduce((n, r) => n + Number((r as unknown as Record<string, unknown>)[key] ?? 0), 0);
}
function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return v;
  }
}
function buildCategoryOptions(cats: Category[]) {
  const byParent = new Map<string | null, Category[]>();
  for (const c of cats) {
    const k = c.parentId ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(c);
  }
  const out: { value: string; label: string; depth: number }[] = [];
  function walk(parent: string | null, depth: number) {
    const children = (byParent.get(parent) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const ch of children) {
      const label = depth === 0 ? ch.name : `${"— ".repeat(depth)}${ch.name}`;
      // hierarchical path for clarity
      out.push({ value: ch.id, label, depth });
      walk(ch.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}
function categoryPath(cats: Category[], id: string) {
  const map = new Map(cats.map((c) => [c.id, c]));
  const parts: string[] = [];
  let cur: string | null = id;
  while (cur) {
    const c = map.get(cur);
    if (!c) break;
    parts.unshift(c.name);
    cur = c.parentId ?? null;
  }
  return parts.join(" / ") || "—";
}

// --- Quick Create Categories: predefined starter hierarchy ---
type QCItem = { name: string; parent: string | null; level: number };
const QUICK_CREATE_GROUPS: { parent: string; children: string[] }[] = [
  { parent: "Rent & Property", children: ["Rent", "Service Charge", "Property Maintenance", "Repair & Maintenance", "Security", "Cleaning"] },
  { parent: "Utilities", children: ["Electricity", "Water", "Gas", "Internet", "Telephone", "Mobile Bill"] },
  { parent: "Staff & Payroll", children: ["Salary", "Overtime", "Staff Bonus", "Staff Allowance", "Staff Meal", "Staff Transportation", "Staff Training"] },
  { parent: "Marketing & Advertising", children: ["Advertising", "Facebook/Instagram Ads", "Google Ads", "Printing", "Banner & Signboard", "Promotion", "Photography/Videography"] },
  { parent: "Delivery & Transportation", children: ["Delivery", "Courier", "Transport", "Fuel", "Vehicle Maintenance", "Parking", "Toll"] },
  { parent: "Technology & Software", children: ["Software Subscription", "POS Subscription", "Domain & Hosting", "Cloud Services", "IT Support", "Computer Equipment", "Printer & Scanner", "Internet Equipment"] },
  { parent: "Store Operations", children: ["Packaging", "Shopping Bag", "Stationery", "Office Supplies", "Cleaning Supplies", "Store Supplies", "Printing & Photocopy", "Drinking Water"] },
  { parent: "Repairs & Maintenance", children: ["Equipment Repair", "Computer Repair", "POS Machine Repair", "AC Maintenance", "Electrical Repair", "Furniture Repair", "Building Maintenance"] },
  { parent: "Banking & Financial", children: ["Bank Charges", "MFS Charges", "Card Processing Fee", "Transaction Fee", "Loan Interest", "Other Financial Charges"] },
  { parent: "Government & Compliance", children: ["License Fee", "Trade License", "Government Fee", "Tax & VAT", "Regulatory Fee", "Legal & Compliance"] },
  { parent: "Business & Administrative", children: ["Office Expense", "Legal Expense", "Accounting Expense", "Consultancy", "Professional Services", "Training", "Business Travel", "Meeting Expense"] },
  { parent: "Fashion & Retail", children: ["Alteration", "Tailoring", "Embroidery", "Garment Repair", "Hanger", "Display Materials", "Mannequin", "Packaging Materials", "Product Photography", "Sample/Prototype"] },
  { parent: "Staff Welfare", children: ["Staff Food", "Tea/Coffee", "Refreshments", "Employee Welfare", "Medical Assistance"] },
];
const QUICK_CREATE_STRUCTURE = "Operating Expenses";
function getQuickCreateItems(): QCItem[] {
  const items: QCItem[] = [];
  items.push({ name: QUICK_CREATE_STRUCTURE, parent: null, level: 0 });
  for (const g of QUICK_CREATE_GROUPS) {
    items.push({ name: g.parent, parent: QUICK_CREATE_STRUCTURE, level: 1 });
    for (const ch of g.children) items.push({ name: ch, parent: g.parent, level: 2 });
  }
  return items;
}
const ALL_QC_ITEMS = getQuickCreateItems();

export default function ExpensesPage() {
  const { me } = useMe();
  const qc = useQueryClient();
  const catsQuery = useQuery({
    queryKey: ["expense-cats"],
    queryFn: () => api<Category[]>("/api/v1/finance/expense-categories"),
  });
  const cats = catsQuery.data ?? [];
  const catOptions = useMemo(() => buildCategoryOptions(cats), [cats]);
  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const paymentAccounts = useQuery({
    queryKey: ["payment-accounts"],
    queryFn: () => api<{ id: string; name: string; type: string }[]>("/api/v1/finance/payment-accounts"),
  });
  const suppliers = useQuery({
    queryKey: ["suppliers-expense"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers"),
    retry: false,
  });
  const acctSettings = useQuery({
    queryKey: ["accounting-settings"],
    queryFn: () => api<{ defaultTaxRecoverable: boolean }>("/api/v1/finance/accounting-settings"),
    retry: false,
  });

  const list = useServerList<ExpenseRow>("expenses", "/api/v1/finance/expenses");
  const rows = list.rows;

  // view mode
  const [view, setView] = useState<"list" | "cards">("list");
  useEffect(() => {
    const v = typeof window !== "undefined" ? (localStorage.getItem("expenses:view") as "list" | "cards" | null) : null;
    if (v === "list" || v === "cards") setView(v);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("expenses:view", view);
  }, [view]);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [viewing, setViewing] = useState<ExpenseRow | null>(null);
  const [pendingVoid, setPendingVoid] = useState<ExpenseRow | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [inlineCatOpen, setInlineCatOpen] = useState(false);
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [prefillCategoryId, setPrefillCategoryId] = useState<string | null>(null);

  // form state for create/edit
  const [form, setForm] = useState<Record<string, string>>({});
  const dialogOpen = createOpen || Boolean(editing);
  const isEdit = Boolean(editing);

  // category dialog state
  const [catSearch, setCatSearch] = useState("");
  const [catForm, setCatForm] = useState<{ name: string; parentId: string }>({ name: "", parentId: "" });
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catPendingDelete, setCatPendingDelete] = useState<Category | null>(null);

  // inline category create state
  const [inlineCatForm, setInlineCatForm] = useState<{ name: string; parentId: string }>({ name: "", parentId: "" });

  // Quick Create Categories state
  const [qcSelected, setQcSelected] = useState<Set<string>>(() => new Set());
  const [qcRunning, setQcRunning] = useState(false);
  const [qcResult, setQcResult] = useState<{ created: number; skipped: number; failed: { name: string; reason: string }[] } | null>(null);
  const existingNames = useMemo(() => new Set(cats.map((c) => c.name.trim().toLowerCase())), [cats]);

  // init default selection: all unselected (user picks what to create)
  useEffect(() => {
    if (!quickCreateOpen) return;
    setQcSelected(new Set());
    setQcResult(null);
  }, [quickCreateOpen]);

  const openCreate = (categoryId?: string) => {
    setEditing(null);
    const defTax = acctSettings.data?.defaultTaxRecoverable ? "true" : "false";
    setForm({
      categoryId: categoryId ?? prefillCategoryId ?? "",
      subtotal: "",
      taxAmount: "",
      taxRecoverable: defTax,
      paymentAccountId: "",
      method: "",
      vendorId: "",
      vendor: "",
      notes: "",
      branchId: me?.branches?.[0]?.id ?? "",
    });
    if (categoryId) setPrefillCategoryId(null);
    setCreateOpen(true);
  };
  const openQuickExpense = (catId: string) => {
    openCreate(catId);
  };
  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setForm({
      categoryId: row.categoryId ?? row.category?.id ?? "",
      subtotal: String((row as unknown as Record<string, unknown>).subtotal ?? row.amount ?? ""),
      taxAmount: String((row as unknown as Record<string, unknown>).taxAmount ?? row.tax ?? ""),
      taxRecoverable: String(row.taxRecoverable ?? acctSettings.data?.defaultTaxRecoverable ?? false),
      paymentAccountId: row.paymentAccountId ?? "",
      method: row.method ?? "",
      vendorId: row.vendorId ?? "",
      vendor: row.vendor ?? "",
      notes: row.notes ?? "",
      branchId: row.branchId ?? "",
    });
    setCreateOpen(false);
  };
  const closeDialog = () => {
    setCreateOpen(false);
    setEditing(null);
    setForm({});
  };

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => api("/api/v1/finance/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toastCreated("expense");
      closeDialog();
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not create expense"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api(`/api/v1/finance/expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      toastUpdated("expense");
      closeDialog();
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not save expense"),
  });
  const voidMut = useMutation({
    mutationFn: (id: string) => api(`/api/v1/finance/expenses/${id}/void`, { method: "POST" }),
    onSuccess: () => {
      toastUpdated("expense");
      setPendingVoid(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not void expense"),
  });

  const createCatMut = useMutation({
    mutationFn: (data: { name: string; parentId?: string }) =>
      api<Category>("/api/v1/finance/expense-categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      toastCreated("category");
      catsQuery.refetch();
      qc.invalidateQueries({ queryKey: ["expense-cats"] });
      // auto-select in form if dialog was open
      if (dialogOpen) {
        setForm((s) => ({ ...s, categoryId: (data as unknown as Category).id }));
      }
      setCatForm({ name: "", parentId: "" });
      setEditingCat(null);
    },
    onError: (e) => toastError(e, "Could not create category"),
  });
  const updateCatMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parentId?: string | null } }) =>
      api(`/api/v1/finance/expense-categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      toastUpdated("category");
      catsQuery.refetch();
      setEditingCat(null);
      setCatForm({ name: "", parentId: "" });
    },
    onError: (e) => toastError(e, "Could not update category"),
  });
  const deleteCatMut = useMutation({
    mutationFn: (id: string) => api(`/api/v1/finance/expense-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toastDeleted("category");
      catsQuery.refetch();
      setCatPendingDelete(null);
    },
    onError: (e) => toastError(e, "Could not delete category"),
  });

  const inlineCreateCatMut = useMutation({
    mutationFn: (data: { name: string; parentId?: string }) =>
      api<Category>("/api/v1/finance/expense-categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      toastCreated("category");
      catsQuery.refetch();
      qc.invalidateQueries({ queryKey: ["expense-cats"] });
      setForm((s) => ({ ...s, categoryId: (data as unknown as Category).id }));
      setInlineCatOpen(false);
      setInlineCatForm({ name: "", parentId: "" });
    },
    onError: (e) => toastError(e, "Could not create category"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { ...form };
    // normalize
    if (payload.subtotal) payload.subtotal = String(payload.subtotal);
    if (payload.taxAmount) payload.taxAmount = String(payload.taxAmount);
    else delete payload.taxAmount;
    if (payload.taxRecoverable) payload.taxRecoverable = payload.taxRecoverable === "true";
    else if (acctSettings.data) payload.taxRecoverable = acctSettings.data.defaultTaxRecoverable;
    if (!payload.paymentAccountId) delete payload.paymentAccountId;
    else delete payload.method;
    if (!payload.vendorId) delete payload.vendorId;
    if (!payload.vendor) delete payload.vendor;
    if (!payload.branchId) delete payload.branchId;
    if (!payload.notes) delete payload.notes;
    if (!payload.categoryId) {
      toastError(new Error("Category is required"), "Category is required");
      return;
    }
    if (isEdit && editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const pending = createMut.isPending || updateMut.isPending;
  const filteredCats = useMemo(() => {
    if (!catSearch.trim()) return cats;
    const q = catSearch.toLowerCase();
    return cats.filter((c) => c.name.toLowerCase().includes(q) || categoryPath(cats, c.id).toLowerCase().includes(q));
  }, [cats, catSearch]);
  const quickCats = useMemo(() => cats.slice(0).sort((a, b) => a.name.localeCompare(b.name)), [cats]);

  return (
    <AppShell>
      <PageHeader
        title="Expenses"
        description="Posted operating expenses by category and branch. Subtotal + VAT = Total. Payment account determines ledger credit."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setQuickCreateOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Quick Create
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuickCategoryOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Quick Category
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button type="button" onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      </PageHeader>

      <SummaryCards
        items={[
          { label: "Records", value: list.pager.total, accent: "sky" as const },
          {
            label: "Amount",
            value: moneyText(sumField(rows as ExpenseRow[], (rows[0] as unknown as { totalAmount?: string })?.totalAmount != null ? "totalAmount" : "amount")),
            accent: "rose" as const,
            description: "This page",
          },
          { label: "Posted", value: rows.filter((r) => r.status === "POSTED").length, accent: "emerald" as const },
        ]}
      />

      {/* Quick Expense + Quick Category */}
      <div className="mt-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Quick Expenses</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{quickCats.length} categories</span>
            <Button type="button" variant="ghost" size="xs" className="h-6 px-2" onClick={() => setQuickCategoryOpen(true)}>
              <Tag className="mr-1 h-3 w-3" /> Quick Category
            </Button>
            <Button type="button" variant="ghost" size="xs" className="h-6 px-2" onClick={() => setInlineCatOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> New Category
            </Button>
          </div>
        </div>
        {quickCats.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No categories yet. Create one to enable quick add.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {quickCats.map((c) => (
              <Button key={c.id} type="button" variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => openQuickExpense(c.id)}>
                {c.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* List / Card toggle + toolbar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <Button type="button" variant={view === "list" ? "secondary" : "ghost"} size="xs" className="h-7 px-3" onClick={() => setView("list")}>
            <LayoutList className="mr-1.5 h-3.5 w-3.5" /> List
          </Button>
          <Button type="button" variant={view === "cards" ? "secondary" : "ghost"} size="xs" className="h-7 px-3" onClick={() => setView("cards")}>
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Cards
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">{list.pager.total} records</div>
      </div>

      {list.isLoading ? <TableLoadingSkeleton columns={7} rows={8} /> : null}
      {list.isError && !rows.length ? <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /> : null}

      {!list.isLoading ? (
        <DataTable>
          <TableToolbar>
            <SearchInput
              value={list.draft}
              onChange={list.setDraft}
              placeholder="Search vendor or notes"
              loading={list.searching || (list.isFetching && !list.isLoading)}
            />
            <FilterSelect
              value={list.status}
              onChange={(v) => list.setFilter("status", v)}
              options={[
                { value: "POSTED", label: "Posted" },
                { value: "VOIDED", label: "Voided" },
              ]}
              placeholder="Status"
            />
            <DateRangeFilter from={list.from} to={list.to} onChange={(k, v) => list.setFilter(k, v)} />
            {list.hasFilters ? (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={list.reset}>
                Reset
              </Button>
            ) : null}
          </TableToolbar>
          <FilterChips chips={list.activeFilters} onRemove={(k) => (k === "search" ? list.setDraft("") : list.setFilter(k, ""))} onClear={list.reset} />

          {view === "list" ? (
            !rows.length ? (
              <EmptyState
                title={list.hasFilters ? "No records match your current filters." : "No expenses yet"}
                hint={list.hasFilters ? "Try clearing filters." : emptyHintFor("/expenses") ?? "Use Add Expense to create the first one."}
                action={
                  list.hasFilters ? (
                    <Button type="button" variant="outline" size="sm" onClick={list.reset}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => openCreate()}>
                      <Plus className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                  )
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className={tableCellNumeric}>Total</TableHead>
                    <TableHead className={tableCellNumeric}>VAT</TableHead>
                    <TableHead>Pay</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const total = (row as unknown as Record<string, unknown>).totalAmount ?? row.amount;
                    const tax = (row as unknown as Record<string, unknown>).taxAmount ?? row.tax ?? 0;
                    const isVoided = row.status === "VOIDED";
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.category?.name ?? categoryPath(cats, row.categoryId) ?? "—"}</TableCell>
                        <TableCell>{row.vendor ?? (row.vendorId ? catMap.get(row.vendorId)?.name ?? row.vendorId : "—")}</TableCell>
                        <TableCell className={tableCellNumeric}>{moneyCell(total)}</TableCell>
                        <TableCell className={tableCellNumeric}>{moneyText(tax)}</TableCell>
                        <TableCell>{row.method}</TableCell>
                        <TableCell>{row.branch?.name ?? row.branchId ?? "—"}</TableCell>
                        <TableCell>{formatDate(row.businessDate)}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell className={tableCellActions}>
                          <IconActionButton icon={<Eye className="h-3.5 w-3.5" />} label="View" onClick={() => setViewing(row)} />
                          {!isVoided ? <IconActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={() => openEdit(row)} /> : null}
                          {!isVoided ? (
                            <IconActionButton icon={<Trash2 className="h-3.5 w-3.5" />} label="Void" variant="destructive" onClick={() => setPendingVoid(row)} />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          ) : (
            // Card view
            <div className="p-3">
              {!rows.length ? (
                <EmptyState
                  title={list.hasFilters ? "No records match your current filters." : "No expenses yet"}
                  hint={list.hasFilters ? "Try clearing filters." : "Use Add Expense to create the first one."}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rows.map((row) => {
                    const total = (row as unknown as Record<string, unknown>).totalAmount ?? row.amount;
                    const isVoided = row.status === "VOIDED";
                    return (
                      <div key={row.id} className="flex flex-col rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{row.category?.name ?? categoryPath(cats, row.categoryId)}</div>
                            <div className="truncate text-xs text-muted-foreground">{row.vendor ?? "No vendor"} • {row.branch?.name ?? row.branchId ?? "—"}</div>
                          </div>
                          {statusBadge(row.status)}
                        </div>
                        <div className="mt-2 text-base font-semibold tabular-nums">{moneyText(total)}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.method} • {formatDate(row.businessDate)}
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="xs" onClick={() => setViewing(row)}>
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Button>
                          {!isVoided ? (
                            <Button type="button" variant="ghost" size="xs" onClick={() => openEdit(row)}>
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                          ) : null}
                          {!isVoided ? (
                            <Button type="button" variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={() => setPendingVoid(row)}>
                              Void
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <TablePagination {...list.pager} />
        </DataTable>
      ) : null}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        title={isEdit ? "Edit expense" : "Create expense"}
        description={isEdit ? "Update the fields and save." : "Subtotal + VAT = Total. Payment account sets ledger credit."}
        size="lg"
        onClose={closeDialog}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" form="expense-form" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save expense" : "Create expense"}
            </Button>
          </>
        }
      >
        <form id="expense-form" className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Category *">
            <div className="flex gap-2">
              <select
                className={inputClass + " flex-1"}
                required
                value={form.categoryId ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
              >
                <option value="">Select category</option>
                {catOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setInlineCatOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New
              </Button>
            </div>
            <button type="button" className="mt-1 text-xs text-primary underline-offset-4 hover:underline" onClick={() => setInlineCatOpen(true)}>
              + Create new category
            </button>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subtotal *">
              <input className={inputClass} type="number" step="0.01" placeholder="10000" required value={form.subtotal ?? ""} onChange={(e) => setForm((s) => ({ ...s, subtotal: e.target.value }))} />
            </Field>
            <Field label="VAT / Tax">
              <input className={inputClass} type="number" step="0.01" placeholder="0" value={form.taxAmount ?? ""} onChange={(e) => setForm((s) => ({ ...s, taxAmount: e.target.value }))} />
            </Field>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            Total: <span className="font-medium tabular-nums">{moneyText(Number(form.subtotal || 0) + Number(form.taxAmount || 0))}</span>
            <span className="ml-2 text-xs text-muted-foreground">auto = subtotal + vat</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="VAT Recoverable">
              <select className={inputClass} value={form.taxRecoverable ?? ""} onChange={(e) => setForm((s) => ({ ...s, taxRecoverable: e.target.value }))}>
                <option value="">Default ({acctSettings.data?.defaultTaxRecoverable ? "Yes" : "No"})</option>
                <option value="true">Yes — Input VAT</option>
                <option value="false">No — Expense includes VAT</option>
              </select>
            </Field>
            <Field label="Business Date">
              <input className={inputClass} type="date" value={form.businessDate ?? ""} onChange={(e) => setForm((s) => ({ ...s, businessDate: e.target.value }))} />
            </Field>
          </div>

          <Field label="Payment Account">
            <select className={inputClass} value={form.paymentAccountId ?? ""} onChange={(e) => setForm((s) => ({ ...s, paymentAccountId: e.target.value }))}>
              <option value="">Select account (optional)</option>
              {(paymentAccounts.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
            {!form.paymentAccountId ? (
              <select className={inputClass + " mt-2"} value={form.method ?? ""} onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}>
                <option value="">Method (if no account)</option>
                {["CASH", "CARD", "BANK", "MFS"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : null}
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Supplier (Vendor)">
              <select className={inputClass} value={form.vendorId ?? ""} onChange={(e) => setForm((s) => ({ ...s, vendorId: e.target.value }))}>
                <option value="">Select supplier</option>
                {(suppliers.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vendor (text fallback)">
              <input className={inputClass} placeholder="DESCO" value={form.vendor ?? ""} onChange={(e) => setForm((s) => ({ ...s, vendor: e.target.value }))} />
            </Field>
          </div>

          <Field label="Branch">
            <select className={inputClass} value={form.branchId ?? ""} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
              <option value="">Select branch</option>
              {(me?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea className={inputClass + " min-h-[70px]"} placeholder="Electricity bill Sep" value={form.notes ?? ""} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </Field>
        </form>
      </Dialog>

      {/* Inline category create from form */}
      <Dialog open={inlineCatOpen} title="Create Expense Category" description="Add a new category and it will be auto-selected." size="sm" onClose={() => setInlineCatOpen(false)} footer={
        <>
          <Button type="button" variant="outline" onClick={() => setInlineCatOpen(false)}>Cancel</Button>
          <Button type="button" disabled={!inlineCatForm.name.trim() || inlineCreateCatMut.isPending} onClick={() => inlineCreateCatMut.mutate({ name: inlineCatForm.name.trim(), parentId: inlineCatForm.parentId || undefined })}>
            {inlineCreateCatMut.isPending ? "Creating…" : "Create Category"}
          </Button>
        </>
      }>
        <div className="grid gap-3">
          <Field label="Name *">
            <input className={inputClass} placeholder="Electricity" value={inlineCatForm.name} onChange={(e) => setInlineCatForm((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="Parent Category">
            <select className={inputClass} value={inlineCatForm.parentId} onChange={(e) => setInlineCatForm((s) => ({ ...s, parentId: e.target.value }))}>
              <option value="">None (top level)</option>
              {catOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </Dialog>

      {/* Quick Category picker - same options as categories */}
      <Dialog open={quickCategoryOpen} title="Quick Category" description="Select a category to create an expense. Same options as Expense Categories." size="sm" onClose={() => setQuickCategoryOpen(false)} footer={<Button type="button" variant="outline" onClick={() => setQuickCategoryOpen(false)}>Close</Button>}>
        <div className="space-y-3">
          <SearchInput value={catSearch} onChange={setCatSearch} placeholder="Search categories" />
          <div className="max-h-[50vh] divide-y overflow-auto rounded-lg border">
            {filteredCats.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No categories.</div> : filteredCats.map((c) => (
              <button key={c.id} type="button" className="flex w-full items-center justify-between gap-2 p-2.5 text-left hover:bg-muted/50" onClick={() => { setQuickCategoryOpen(false); openCreate(c.id); }}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{categoryPath(cats, c.id)}</div>
                </div>
                <span className="shrink-0 text-xs text-primary">Select →</span>
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { setQuickCategoryOpen(false); setInlineCatOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Create new category
          </Button>
        </div>
      </Dialog>

      {/* Quick Create Categories - multi-select starter pack */}
      <Dialog
        open={quickCreateOpen}
        title="Quick Create Categories"
        description="Select multiple starter categories and create them together. Hierarchy will be preserved and parents auto-created if needed."
        size="lg"
        onClose={() => setQuickCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setQuickCreateOpen(false)}>Close</Button>
            <Button
              type="button"
              disabled={qcSelected.size === 0 || qcRunning}
              onClick={async () => {
                const selectedNames = Array.from(qcSelected);
                // expand to include missing ancestors
                const toCreateSet = new Set(selectedNames);
                const nameToParent = new Map(ALL_QC_ITEMS.map((it) => [it.name, it.parent]));
                for (const n of selectedNames) {
                  let p = nameToParent.get(n) ?? null;
                  while (p) {
                    if (!existingNames.has(p.toLowerCase()) && !toCreateSet.has(p)) toCreateSet.add(p);
                    p = nameToParent.get(p) ?? null;
                  }
                }
                // sort by level: 0,1,2 to ensure parents first
                const levelMap = new Map(ALL_QC_ITEMS.map((it) => [it.name, it.level]));
                const ordered = Array.from(toCreateSet).sort((a, b) => (levelMap.get(a) ?? 99) - (levelMap.get(b) ?? 99));
                setQcRunning(true);
                setQcResult(null);
                let created = 0;
                let skipped = 0;
                const failed: { name: string; reason: string }[] = [];
                const nameToId = new Map<string, string>();
                // preload existing
                for (const c of cats) nameToId.set(c.name.toLowerCase(), c.id);
                for (const name of ordered) {
                  const lower = name.toLowerCase();
                  if (existingNames.has(lower)) {
                    skipped += 1;
                    continue;
                  }
                  // if already created in this batch, skip duplicate check (name unique)
                  if (nameToId.has(lower)) {
                    skipped += 1;
                    continue;
                  }
                  const parentName = nameToParent.get(name) ?? null;
                  const parentId = parentName ? nameToId.get(parentName.toLowerCase()) ?? null : null;
                  try {
                    const res = await api<Category>("/api/v1/finance/expense-categories", {
                      method: "POST",
                      body: JSON.stringify({ name, parentId: parentId ?? undefined }),
                    });
                    const id = (res as unknown as Category).id ?? (res as unknown as { id: string }).id;
                    if (id) nameToId.set(lower, id);
                    created += 1;
                  } catch (e: unknown) {
                    const err = e as { message?: string; code?: string; status?: number };
                    const msg = err?.message ?? "Failed";
                    if (err?.status === 409 || err?.code === "CONFLICT" || msg.toLowerCase().includes("already exists")) {
                      skipped += 1;
                    } else {
                      failed.push({ name, reason: msg });
                    }
                  }
                }
                setQcResult({ created, skipped, failed });
                setQcRunning(false);
                catsQuery.refetch();
                qc.invalidateQueries({ queryKey: ["expense-cats"] });
                // keep selection but disable already existing handling on next open
                if (failed.length === 0) {
                  // leave dialog open to show summary
                }
              }}
            >
              {qcRunning ? "Creating…" : `Create Selected (${qcSelected.size} selected)`}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {qcSelected.size} selected {qcResult ? `• Created ${qcResult.created} • Skipped ${qcResult.skipped}${qcResult.failed.length ? ` • Failed ${qcResult.failed.length}` : ""}` : ""}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  const missing = ALL_QC_ITEMS.filter((it) => !existingNames.has(it.name.trim().toLowerCase())).map((it) => it.name);
                  setQcSelected(new Set(missing));
                }}
              >
                Select All
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={() => setQcSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>

          {qcResult && (qcResult.created > 0 || qcResult.skipped > 0 || qcResult.failed.length > 0) ? (
            <div className="rounded-md border bg-muted/30 p-2 text-xs">
              <div>Created: {qcResult.created} • Already exists/skipped: {qcResult.skipped} {qcResult.failed.length ? `• Failed: ${qcResult.failed.length}` : ""}</div>
              {qcResult.failed.length ? (
                <ul className="mt-1 list-disc pl-4 text-destructive">
                  {qcResult.failed.map((f) => (
                    <li key={f.name}>{f.name}: {f.reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="max-h-[58vh] overflow-auto rounded-lg border divide-y">
            {/* Top level */}
            {(() => {
              const groups = QUICK_CREATE_GROUPS;
              return (
                <>
                  {[
                    { name: QUICK_CREATE_STRUCTURE, parent: null as string | null, children: groups.map((g) => g.parent) },
                    ...groups.map((g) => ({ name: g.parent, parent: QUICK_CREATE_STRUCTURE, children: g.children })),
                  ].map((section) => {
                    const isTop = section.parent === null;
                    return (
                      <div key={section.name} className="p-2">
                        <div className="mb-2 flex items-center gap-2">
                          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted/40">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={qcSelected.has(section.name)}
                              disabled={existingNames.has(section.name.trim().toLowerCase())}
                              onChange={(e) => {
                                const next = new Set(qcSelected);
                                if (e.target.checked) {
                                  next.add(section.name);
                                  // auto select children if parent selected? optional
                                } else next.delete(section.name);
                                setQcSelected(next);
                              }}
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block truncate text-sm font-medium">{section.name} {existingNames.has(section.name.trim().toLowerCase()) ? <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">Already Exists</span> : null}</span>
                              <span className="block truncate text-xs text-muted-foreground">{isTop ? "Root • " : "Child of " + section.parent + " • "}{section.children.length} children</span>
                            </span>
                          </label>
                        </div>
                        {!isTop ? (
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {section.children.map((ch) => {
                              const exists = existingNames.has(ch.trim().toLowerCase());
                              const checked = qcSelected.has(ch);
                              return (
                                <label key={ch} className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/40 ${exists ? "opacity-60" : ""} ${checked ? "bg-primary/5 border-primary/30" : ""}`}>
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    checked={checked}
                                    disabled={exists}
                                    onChange={(e) => {
                                      const next = new Set(qcSelected);
                                      if (e.target.checked) {
                                        next.add(ch);
                                        // auto include parent if needed on submit, but also visually auto-check parent for clarity
                                        if (!existingNames.has(section.name.toLowerCase()) && !next.has(section.name)) next.add(section.name);
                                        if (!existingNames.has(QUICK_CREATE_STRUCTURE.toLowerCase()) && !next.has(QUICK_CREATE_STRUCTURE)) next.add(QUICK_CREATE_STRUCTURE);
                                      } else next.delete(ch);
                                      setQcSelected(next);
                                    }}
                                  />
                                  <span className="flex-1 truncate">{ch} {exists ? <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Exists</span> : null}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                            {section.children.map((ch) => {
                              const exists = existingNames.has(ch.trim().toLowerCase());
                              const checked = qcSelected.has(ch);
                              return (
                                <label key={ch} className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/40 ${exists ? "opacity-60" : ""} ${checked ? "bg-primary/5 border-primary/30" : ""}`}>
                                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={checked} disabled={exists} onChange={(e) => { const next = new Set(qcSelected); if (e.target.checked) next.add(ch); else next.delete(ch); setQcSelected(next); }} />
                                  <span className="flex-1 truncate">{ch} {exists ? <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Exists</span> : null}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
          <p className="text-xs text-muted-foreground">Parents are auto-created if a child is selected and the parent doesn’t exist. Existing categories are disabled and marked “Already Exists”.</p>
        </div>
      </Dialog>

      {/* Categories management */}
      <Dialog open={categoryDialogOpen} title="Expense Categories" description="Manage categories, subcategories, and hierarchy. Delete only when unused." size="lg" onClose={() => setCategoryDialogOpen(false)} footer={
        <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Close</Button>
      }>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <SearchInput value={catSearch} onChange={setCatSearch} placeholder="Search categories" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => catsQuery.refetch()}>Refresh</Button>
          </div>

          <form
            className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!catForm.name.trim()) return;
              if (editingCat) updateCatMut.mutate({ id: editingCat.id, data: { name: catForm.name.trim(), parentId: catForm.parentId || null } });
              else createCatMut.mutate({ name: catForm.name.trim(), parentId: catForm.parentId || undefined });
            }}
          >
            <div className="flex-1"><Field label={editingCat ? "Edit category" : "New category"}>
              <input className={inputClass} placeholder="Utilities" value={catForm.name} onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))} required />
            </Field></div>
            <div className="flex-1"><Field label="Parent">
              <select className={inputClass} value={catForm.parentId} onChange={(e) => setCatForm((s) => ({ ...s, parentId: e.target.value }))}>
                <option value="">None</option>
                {catOptions
                  .filter((o) => !editingCat || o.value !== editingCat.id)
                  .map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
              </select>
            </Field></div>
            <div className="flex gap-2">
              {editingCat ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingCat(null); setCatForm({ name: "", parentId: "" }); }}>Cancel</Button>
              ) : null}
              <Button type="submit" size="sm" disabled={createCatMut.isPending || updateCatMut.isPending}>{editingCat ? "Save" : "+ Add Category"}</Button>
            </div>
          </form>

          <div className="divide-y rounded-lg border">
            {filteredCats.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No categories.</div> : null}
            {filteredCats.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{categoryPath(cats, c.id)} {c.parentId ? "" : "(top)"}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={() => { setEditingCat(c); setCatForm({ name: c.name, parentId: c.parentId ?? "" }); }} />
                  <IconActionButton icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" variant="destructive" onClick={() => setCatPendingDelete(c)} />
                  <Button type="button" variant="outline" size="xs" className="ml-1" onClick={() => { setCategoryDialogOpen(false); openCreate(c.id); }}>Use</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Dialog>

      {/* View */}
      <Dialog open={Boolean(viewing)} title="Expense details" description={viewing ? categoryPath(cats, viewing.categoryId) : undefined} size="md" onClose={() => setViewing(null)} footer={<Button type="button" variant="outline" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-muted-foreground">Total</div><div className="font-medium tabular-nums">{moneyText((viewing as unknown as Record<string, unknown>).totalAmount ?? viewing.amount)}</div></div>
              <div><div className="text-muted-foreground">Subtotal / VAT</div><div className="tabular-nums">{moneyText((viewing as unknown as Record<string, unknown>).subtotal ?? viewing.amount)} / {moneyText((viewing as unknown as Record<string, unknown>).taxAmount ?? viewing.tax ?? 0)}</div></div>
              <div><div className="text-muted-foreground">Method / Account</div><div>{viewing.method} {viewing.paymentAccountId ? `• ${viewing.paymentAccountId}` : ""}</div></div>
              <div><div className="text-muted-foreground">Branch</div><div>{viewing.branch?.name ?? viewing.branchId ?? "—"}</div></div>
              <div><div className="text-muted-foreground">Vendor</div><div>{viewing.vendor ?? viewing.vendorId ?? "—"}</div></div>
              <div><div className="text-muted-foreground">Status</div><div>{statusBadge(viewing.status)}</div></div>
              <div><div className="text-muted-foreground">Date</div><div>{formatDate(viewing.businessDate)}</div></div>
              <div><div className="text-muted-foreground">Created</div><div>{formatDate(viewing.createdAt)}</div></div>
            </div>
            {viewing.notes ? <div><div className="text-muted-foreground">Notes</div><div className="rounded border bg-muted/20 p-2">{viewing.notes}</div></div> : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingVoid)}
        title="Void expense?"
        description={pendingVoid ? `This will void “${pendingVoid.category?.name ?? pendingVoid.id}” and create a reversal journal. POSTED expenses cannot be deleted.` : ""}
        confirmLabel="Void"
        loading={voidMut.isPending}
        onClose={() => setPendingVoid(null)}
        onConfirm={() => pendingVoid && voidMut.mutate(pendingVoid.id)}
      />
      <ConfirmDialog
        open={Boolean(catPendingDelete)}
        title="Delete category?"
        description={catPendingDelete ? `Delete “${catPendingDelete.name}”? Only allowed when no subcategories or expenses use it.` : ""}
        confirmLabel="Delete"
        loading={deleteCatMut.isPending}
        onClose={() => setCatPendingDelete(null)}
        onConfirm={() => catPendingDelete && deleteCatMut.mutate(catPendingDelete.id)}
      />
    </AppShell>
  );
}
