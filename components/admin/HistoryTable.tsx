"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronUp, ChevronDown, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { bulkDeleteHistory, type HistoryDeleteScope } from "@/app/admin/actions";
import { actionLabels, formatDateTime } from "@/lib/history";

export type HistoryRow = {
  id: string;
  createdAt: string;
  recordType: "job" | "application";
  jobId: string;
  jobTitle: string;
  action: string;
  actorName: string;
  actorRole: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
};

const recordTypeLabel: Record<HistoryRow["recordType"], string> = {
  job: "Job posting",
  application: "Application",
};

type SortColumn = "createdAt" | "jobTitle" | "action" | "actorName" | "actorRole";
type Sort = { column: SortColumn; direction: "asc" | "desc" } | null;

const PAGE_SIZE = 10;
const HISTORY_FETCH_CAP = 100;
const TYPED_CONFIRM_THRESHOLD = 20;

const actionBadgeClass: Record<string, string> = {
  insert: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  update: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  delete: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join("\n") : "—";
  return String(value);
}

type DiffEntry = { field: string; previous: string; next: string };

function diffFields(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): DiffEntry[] {
  if (oldData && !newData) {
    return Object.entries(oldData).map(([field, value]) => ({
      field,
      previous: formatValue(value),
      next: "—",
    }));
  }
  if (newData && !oldData) {
    return Object.entries(newData).map(([field, value]) => ({
      field,
      previous: "—",
      next: formatValue(value),
    }));
  }
  if (!oldData || !newData) return [];
  const fields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const entries: DiffEntry[] = [];
  for (const field of fields) {
    const before = formatValue(oldData[field]);
    const after = formatValue(newData[field]);
    if (before !== after) entries.push({ field, previous: before, next: after });
  }
  return entries;
}

function SortableHead({
  column,
  label,
  sort,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sort: Sort;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 text-inherit outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)] rounded"
      >
        {label}
        {active ? (
          sort!.direction === "asc" ? (
            <ChevronUp className="size-3.5 text-[var(--admin-brand)]" />
          ) : (
            <ChevronDown className="size-3.5 text-[var(--admin-brand)]" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export default function HistoryTable({ rows, isAdmin }: { rows: HistoryRow[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<Sort>({ column: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [bulkPending, startBulkTransition] = useTransition();

  const administrators = useMemo(
    () => [...new Set(rows.map((r) => r.actorName))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) => row.jobTitle.toLowerCase().includes(q) || row.actorName.toLowerCase().includes(q)
      );
    }
    if (actionFilter !== "all") {
      result = result.filter((row) => row.action === actionFilter);
    }
    if (actorFilter !== "all") {
      result = result.filter((row) => row.actorName === actorFilter);
    }
    if (dateFrom) {
      result = result.filter((row) => row.createdAt.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((row) => row.createdAt.slice(0, 10) <= dateTo);
    }
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = a[sort.column];
        const bv = b[sort.column];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, actionFilter, actorFilter, dateFrom, dateTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const hasFilters = Boolean(search) || actionFilter !== "all" || actorFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo);
  const selectedRow = rows.find((r) => r.id === selectedRowId) ?? null;

  const pageAllSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
  const pageSomeSelected = visibleRows.some((r) => selectedIds.has(r.id));

  function clearFilters() {
    setSearch("");
    setActionFilter("all");
    setActorFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function handleSort(column: SortColumn) {
    setPage(1);
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of visibleRows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function selectAllMatching() {
    setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  }

  // Scope is inferred from what's actually selected rather than tracked as a
  // separate mode, so the checkboxes stay simple while the confirmation
  // dialog can still say precisely what will be deleted.
  function inferScope(): HistoryDeleteScope {
    const ids = [...selectedIds];
    const filteredIdSet = new Set(filteredRows.map((r) => r.id));
    if (ids.length === filteredRows.length && ids.every((id) => filteredIdSet.has(id))) {
      return "all_matching";
    }
    const visibleIdSet = new Set(visibleRows.map((r) => r.id));
    if (ids.length === visibleRows.length && ids.every((id) => visibleIdSet.has(id))) {
      return "page";
    }
    return "selected";
  }

  const scope = inferScope();
  const scopeDescription =
    scope === "all_matching"
      ? `all ${selectedIds.size} entries matching your filters`
      : scope === "page"
        ? `the ${selectedIds.size} entries on this page`
        : `the ${selectedIds.size} ${selectedIds.size === 1 ? "entry" : "entries"} you selected`;
  const needsTypedConfirm = selectedIds.size > TYPED_CONFIRM_THRESHOLD;

  function handleBulkDelete() {
    setBulkError(null);
    const ids = [...selectedIds];
    const filtersSnapshot = {
      search: search || null,
      action: actionFilter !== "all" ? actionFilter : null,
      actor: actorFilter !== "all" ? actorFilter : null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    };
    startBulkTransition(() => {
      bulkDeleteHistory(ids, scope, filtersSnapshot).then((result) => {
        if ("error" in result) {
          setBulkError(`Couldn't delete the selected entries: ${result.error}`);
        } else {
          setSelectedIds(new Set());
          setTypedConfirm("");
          if (selectedRowId && ids.includes(selectedRowId)) setSelectedRowId(null);
        }
      });
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No changes recorded yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="relative max-w-xs flex-1">
          <Input
            placeholder="Search by job or person..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pr-8"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="insert">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actorFilter} onValueChange={(v) => { setActorFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All administrators</SelectItem>
            {administrators.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <Label htmlFor="history-date-from" className="text-xs text-[var(--admin-text-muted)]">
            From date
          </Label>
          <Input
            id="history-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-[150px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="history-date-to" className="text-xs text-[var(--admin-text-muted)]">
            To date
          </Label>
          <Input
            id="history-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-[150px]"
          />
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Reset filters
          </Button>
        )}
      </div>

      {isAdmin && selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-brand-soft)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[var(--admin-text)]">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-[var(--admin-brand)] underline-offset-2 hover:underline"
            >
              Clear selection
            </button>
            {selectedIds.size < filteredRows.length && (
              <button
                type="button"
                onClick={selectAllMatching}
                className="text-sm text-[var(--admin-brand)] underline-offset-2 hover:underline"
              >
                Select all {filteredRows.length} matching filters
              </button>
            )}
          </div>
          <AlertDialog onOpenChange={(open) => { if (!open) setTypedConfirm(""); }}>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm">
                  Delete selected
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} history entries?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes {scopeDescription}. History is bounded to the most
                  recently fetched {HISTORY_FETCH_CAP} entries, so &quot;all matching&quot; means
                  all matches within that set, not necessarily every matching entry ever recorded.
                  This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {needsTypedConfirm && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="typed-confirm" className="text-sm">
                    Type <span className="font-mono font-semibold">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="typed-confirm"
                    value={typedConfirm}
                    onChange={(e) => setTypedConfirm(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={bulkPending || (needsTypedConfirm && typedConfirm !== "DELETE")}
                  onClick={handleBulkDelete}
                >
                  {bulkPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {bulkError && (
        <p className="mb-3 rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
          {bulkError}
        </p>
      )}

      <p className="mb-2 text-sm text-[var(--admin-text-muted)]">
        Showing {filteredRows.length === 0 ? 0 : pageStart + 1} to{" "}
        {Math.min(pageStart + PAGE_SIZE, filteredRows.length)} of {filteredRows.length} history
        entries
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={pageAllSelected}
                    indeterminate={pageSomeSelected && !pageAllSelected}
                    onCheckedChange={(checked) => togglePage(checked === true)}
                    aria-label="Select all entries on this page"
                  />
                </TableHead>
              )}
              <SortableHead column="createdAt" label="When" sort={sort} onSort={handleSort} />
              <TableHead>Record</TableHead>
              <SortableHead column="jobTitle" label="Job" sort={sort} onSort={handleSort} />
              <SortableHead column="action" label="Change" sort={sort} onSort={handleSort} />
              <SortableHead column="actorName" label="By" sort={sort} onSort={handleSort} />
              <SortableHead column="actorRole" label="Role" sort={sort} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={row.id}
                role="button"
                onClick={() => setSelectedRowId(row.id === selectedRowId ? null : row.id)}
                aria-pressed={row.id === selectedRowId}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRowId(row.id === selectedRowId ? null : row.id);
                  }
                }}
                className={
                  "cursor-pointer outline-none hover:bg-[var(--admin-surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-brand)] " +
                  (row.id === selectedRowId ? "bg-[var(--admin-brand-soft)]" : "")
                }
              >
                {isAdmin && (
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(checked) => toggleRow(row.id, checked === true)}
                      aria-label={`Select entry for ${row.jobTitle}`}
                    />
                  </TableCell>
                )}
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell className="text-xs text-[var(--admin-text-muted)]">
                  {recordTypeLabel[row.recordType]}
                </TableCell>
                <TableCell className="max-w-[220px] truncate" title={`${row.jobTitle} (${row.jobId})`}>
                  {row.jobTitle}
                </TableCell>
                <TableCell>
                  <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (actionBadgeClass[row.action] ?? "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]")}>
                    {actionLabels[row.action] ?? row.action}
                  </span>
                </TableCell>
                <TableCell>{row.actorName}</TableCell>
                <TableCell className="capitalize">{row.actorRole}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {visibleRows.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--admin-border)] py-10 text-center">
          <p className="text-sm text-[var(--admin-text-muted)]">No entries match your search.</p>
          {rows.length >= HISTORY_FETCH_CAP && (
            <p className="max-w-sm text-xs text-[var(--admin-text-muted)]">
              History only loads the most recent {HISTORY_FETCH_CAP} entries, an empty result here
              may mean older entries are outside that window rather than a true no-match.
            </p>
          )}
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Reset filters
            </Button>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedRow && (
        <div className="mt-6 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-medium text-[var(--admin-text)]">Change details</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRowId(null)}>
              Close
            </Button>
          </div>
          <dl className="mb-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Job</dt>
              <dd className="text-sm text-[var(--admin-text)]">{selectedRow.jobTitle}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Job ID</dt>
              <dd className="font-mono text-xs text-[var(--admin-text-muted)]">{selectedRow.jobId}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Action</dt>
              <dd className="text-sm text-[var(--admin-text)]">
                {actionLabels[selectedRow.action] ?? selectedRow.action}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Timestamp</dt>
              <dd className="text-sm text-[var(--admin-text)]">{formatDateTime(selectedRow.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Administrator</dt>
              <dd className="text-sm text-[var(--admin-text)]">{selectedRow.actorName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Role</dt>
              <dd className="text-sm capitalize text-[var(--admin-text)]">{selectedRow.actorRole}</dd>
            </div>
          </dl>

          <h4 className="mb-2 text-sm font-medium text-[var(--admin-text)]">Changed fields</h4>
          {(() => {
            const diff = diffFields(selectedRow.oldData, selectedRow.newData);
            if (diff.length === 0) {
              return <p className="text-sm text-[var(--admin-text-muted)]">No field details available.</p>;
            }
            return (
              <div className="overflow-x-auto rounded-md border border-[var(--admin-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-left text-xs text-[var(--admin-text-muted)]">
                      <th className="px-3 py-2 font-medium">Field</th>
                      <th className="px-3 py-2 font-medium">Previous</th>
                      <th className="px-3 py-2 font-medium">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((entry) => (
                      <tr key={entry.field} className="border-b border-[var(--admin-border)] last:border-0 align-top">
                        <td className="px-3 py-2 font-medium text-[var(--admin-text)]">{entry.field}</td>
                        <td className="max-w-[280px] whitespace-pre-wrap break-words px-3 py-2 text-[var(--admin-text-muted)]">
                          {entry.previous}
                        </td>
                        <td className="max-w-[280px] whitespace-pre-wrap break-words px-3 py-2 text-[var(--admin-text)]">
                          {entry.next}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
