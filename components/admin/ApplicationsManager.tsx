"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ArrowUpDown, FileSpreadsheet, Mail, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { APPLICATION_STATUSES, applicationStatusLabel, type ApplicationListRow } from "@/lib/applications";
import { formatDateTime } from "@/lib/history";

type SortColumn = "createdAt" | "name" | "jobTitle" | "status";
type Sort = { column: SortColumn; direction: "asc" | "desc" } | null;

const PAGE_SIZE = 10;

const statusBadgeClass: Record<string, string> = {
  submitted: "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]",
  under_review: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  interviewing: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  offer: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  hired: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  rejected: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
  withdrawn: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
};

function applicantName(row: ApplicationListRow) {
  return `${row.firstName} ${row.lastName}`;
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

export default function ApplicationsManager({
  rows,
  jobs,
  fetchCap,
}: {
  rows: ApplicationListRow[];
  jobs: { id: string; title: string }[];
  fetchCap: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  // Seeded from ?job=<id> so a click-through from the Jobs tab (see
  // JobsManager.tsx) lands here pre-filtered to that job -- an invalid or
  // stale id just filters down to zero rows rather than erroring, same as
  // a manually-typed URL would.
  const [jobFilter, setJobFilter] = useState<string>(() => searchParams.get("job") ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") ?? "all");
  const [sort, setSort] = useState<Sort>({ column: "createdAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (row) => applicantName(row).toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
      );
    }
    if (jobFilter !== "all") {
      result = result.filter((row) => row.jobId === jobFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((row) => row.status === statusFilter);
    }
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = sort.column === "name" ? applicantName(a) : a[sort.column];
        const bv = sort.column === "name" ? applicantName(b) : b[sort.column];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, jobFilter, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const hasFilters = Boolean(search) || jobFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setJobFilter("all");
    setStatusFilter("all");
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

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No applications submitted yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="relative max-w-xs flex-1">
          <Input
            placeholder="Search by name or email..."
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
        <Select value={jobFilter} onValueChange={(v) => { setJobFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APPLICATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {applicationStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Reset filters
          </Button>
        )}
        <Link
          href="/admin/applications/mass-email"
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-[var(--admin-brand)] underline-offset-2 hover:underline"
        >
          <Mail className="size-4" />
          Mass email
        </Link>
        <Link
          href={jobFilter === "all" ? "/admin/applications/export" : `/admin/applications/export?job=${jobFilter}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--admin-brand)] underline-offset-2 hover:underline"
        >
          <FileSpreadsheet className="size-4" />
          {jobFilter === "all" ? "Export .xlsx" : "Export .xlsx (this job)"}
        </Link>
      </div>

      <p className="mb-2 text-sm text-[var(--admin-text-muted)]">
        Showing {filteredRows.length === 0 ? 0 : pageStart + 1} to{" "}
        {Math.min(pageStart + PAGE_SIZE, filteredRows.length)} of {filteredRows.length} applications
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <SortableHead column="createdAt" label="Submitted" sort={sort} onSort={handleSort} />
              <SortableHead column="name" label="Applicant" sort={sort} onSort={handleSort} />
              <SortableHead column="jobTitle" label="Job" sort={sort} onSort={handleSort} />
              <SortableHead column="status" label="Status" sort={sort} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={row.id}
                role="button"
                onClick={() => router.push(`/admin/applications/${row.id}`)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/admin/applications/${row.id}`);
                  }
                }}
                className="cursor-pointer outline-none hover:bg-[var(--admin-surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-brand)]"
              >
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>{applicantName(row)}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={row.jobTitle}>
                  {row.jobTitle}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (statusBadgeClass[row.status] ?? "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]")
                    }
                  >
                    {applicationStatusLabel(row.status)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {visibleRows.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--admin-border)] py-10 text-center">
          <p className="text-sm text-[var(--admin-text-muted)]">No applications match your search.</p>
          {rows.length >= fetchCap && (
            <p className="max-w-sm text-xs text-[var(--admin-text-muted)]">
              Only the most recent {fetchCap} applications load here, an empty result here may mean
              older applications are outside that window rather than a true no-match.
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
    </div>
  );
}
