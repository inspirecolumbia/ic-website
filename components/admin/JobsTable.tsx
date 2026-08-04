"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { transitionStatus, duplicateJob, reorderJobs, deleteJob, bulkDeleteJobs } from "@/app/admin/actions";
import { getDisplayStatus, type DisplayStatus } from "@/lib/jobs";
import type { Database } from "@/lib/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobStatus = Database["public"]["Enums"]["job_status"];
type SortColumn = "title" | "status" | "updated";
type Sort = { column: SortColumn; direction: "asc" | "desc" } | null;

const statusFilters: { value: DisplayStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

const statusBadgeClass: Record<DisplayStatus, string> = {
  draft: "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]",
  published: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  scheduled: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  closed: "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]",
  archived: "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]",
};

const statusLabel: Record<DisplayStatus, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  closed: "Closed",
  archived: "Archived",
};

function rowActions(displayStatus: DisplayStatus): { label: string; value: JobStatus }[] {
  switch (displayStatus) {
    case "draft":
      return [{ label: "Publish", value: "published" }];
    case "published":
    case "scheduled":
      return [{ label: "Unpublish", value: "closed" }];
    case "closed":
      return [
        { label: "Publish", value: "published" },
        { label: "Archive", value: "archived" },
      ];
    case "archived":
      return [];
  }
}

function sortValue(job: JobRow, column: SortColumn) {
  switch (column) {
    case "title":
      return job.title.toLowerCase();
    case "status":
      return job.status;
    case "updated":
      return job.updated_at;
  }
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

function SortableRow({
  job,
  position,
  total,
  canWrite,
  canReorder,
  selected,
  onToggleSelect,
  onMove,
  onMoveToEdge,
  onEdit,
  registerRowTrigger,
  isFirst,
  isLast,
}: {
  job: JobRow;
  position: number;
  total: number;
  canWrite: boolean;
  canReorder: boolean;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onMoveToEdge: (id: string, edge: "top" | "bottom") => void;
  onEdit: (job: JobRow) => void;
  registerRowTrigger?: (id: string, el: HTMLButtonElement | null) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    disabled: !canWrite || !canReorder,
  });
  const displayStatus = getDisplayStatus(job);
  const actions = rowActions(displayStatus);
  // Disables the actions menu while a row action is in flight so a rapid
  // double-click on Duplicate can't fire two overlapping inserts (the second
  // would silently lose the unique-slug race and drop with no feedback).
  const [actionPending, startActionTransition] = useTransition();
  function runRowAction(fn: () => Promise<void>) {
    startActionTransition(async () => {
      await fn();
    });
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        (isDragging ? "opacity-50 " : "") +
        (selected ? "bg-[var(--admin-brand-soft)] " : "") +
        "hover:bg-[var(--admin-surface-hover)] [&>td]:py-1.5"
      }
    >
      {canWrite && (
        <TableCell className="w-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelect(job.id, checked === true)}
            aria-label={`Select ${job.title}`}
          />
        </TableCell>
      )}
      <TableCell className="w-28">
        {canWrite && canReorder && (
          <div className="group/order flex items-center gap-1">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder"
              className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)] active:cursor-grabbing group-hover/order:text-muted-foreground"
            >
              <GripVertical className="size-4" />
            </button>
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Move up"
                title={isFirst ? "Already first" : "Move up"}
                disabled={isFirst}
                onClick={() => onMove(job.id, "up")}
                className="text-muted-foreground/50 group-hover/order:text-muted-foreground focus-visible:text-foreground"
              >
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Move down"
                title={isLast ? "Already last" : "Move down"}
                disabled={isLast}
                onClick={() => onMove(job.id, "down")}
                className="text-muted-foreground/50 group-hover/order:text-muted-foreground focus-visible:text-foreground"
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
            <span className="text-xs text-[var(--admin-text-muted)]">
              {position} of {total}
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="max-w-[240px] truncate" title={job.title}>
        {job.title}
      </TableCell>
      <TableCell>
        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + statusBadgeClass[displayStatus]}>
          {statusLabel[displayStatus]}
        </span>
      </TableCell>
      <TableCell>{new Date(job.updated_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  type="button"
                  aria-label={`Delete ${job.title}`}
                  disabled={!canWrite}
                  className="flex size-8 items-center justify-center rounded-md text-[var(--admin-text-muted)] outline-none hover:bg-[var(--admin-danger-soft)] hover:text-[var(--admin-danger)] focus-visible:bg-[var(--admin-danger-soft)] focus-visible:text-[var(--admin-danger)] focus-visible:ring-2 focus-visible:ring-[var(--admin-danger)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                </button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{job.title}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the job posting. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteJob.bind(null, job.id)}>
                  <AlertDialogAction type="submit" variant="destructive">
                    Delete
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    ref={(el) => registerRowTrigger?.(job.id, el)}
                    type="button"
                    aria-label={`More actions for ${job.title}`}
                    disabled={actionPending}
                    className="flex size-8 items-center justify-center rounded-md text-[var(--admin-text-muted)] outline-none hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  render={<Link href={`/admin/jobs/${job.id}/preview`}>Preview</Link>}
                />
                <DropdownMenuItem onClick={() => onEdit(job)}>Edit</DropdownMenuItem>
                {actions.map((a) => (
                  <DropdownMenuItem
                    key={a.value}
                    onClick={() => runRowAction(() => transitionStatus(job.id, a.value))}
                  >
                    {a.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => runRowAction(() => duplicateJob(job.id))}>
                  Duplicate
                </DropdownMenuItem>
                {canReorder && !isFirst && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onMoveToEdge(job.id, "top")}>
                      <ChevronsUp className="size-4" />
                      Move to top
                    </DropdownMenuItem>
                  </>
                )}
                {canReorder && !isLast && (
                  <DropdownMenuItem onClick={() => onMoveToEdge(job.id, "bottom")}>
                    <ChevronsDown className="size-4" />
                    Move to bottom
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function JobsTable({
  initialJobs,
  canWrite,
  onEdit,
  onNew,
  registerRowTrigger,
}: {
  initialJobs: JobRow[];
  canWrite: boolean;
  onEdit: (job: JobRow) => void;
  onNew: () => void;
  registerRowTrigger?: (id: string, el: HTMLButtonElement | null) => void;
}) {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState(initialJobs);
  const [prevInitialJobs, setPrevInitialJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | "all">(() => {
    const fromUrl = searchParams.get("status");
    return statusFilters.some((f) => f.value === fromUrl) ? (fromUrl as DisplayStatus) : "all";
  });
  const [sort, setSort] = useState<Sort>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDeletePending, startBulkDeleteTransition] = useTransition();
  const [, startTransition] = useTransition();

  // Keep in sync with fresh server data after publish/duplicate/delete
  // (those actions revalidate the route but don't touch this local state
  // directly, only reorder does that optimistically). Adjusted during render
  // rather than in an effect, per React's guidance for deriving state from
  // changed props without an extra render pass.
  if (initialJobs !== prevInitialJobs) {
    setPrevInitialJobs(initialJobs);
    setJobs(initialJobs);
    setSelectedIds((prev) => {
      const ids = new Set(initialJobs.map((j) => j.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (job) => job.title.toLowerCase().includes(q) || job.id.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((job) => getDisplayStatus(job) === statusFilter);
    }
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = sortValue(a, sort.column);
        const bv = sortValue(b, sort.column);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [jobs, search, statusFilter, sort]);

  // Manual drag/up-down reordering only makes sense against the true,
  // complete, unfiltered, unsorted (display_order) list, otherwise a move
  // would silently persist an order based on a partial or resorted view
  // instead of the order staff actually intended.
  const canReorder = !search && !sort && statusFilter === "all";
  const hasFilters = Boolean(search) || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  function handleSort(column: SortColumn) {
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  }

  function persistOrder(previous: JobRow[], next: JobRow[]) {
    setReorderError(null);
    setJobs(next);
    startTransition(() => {
      reorderJobs(next.map((job) => job.id)).then((result) => {
        if (result?.error) {
          setJobs(previous);
          setReorderError("Couldn't save the new order, try again.");
        }
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = jobs.findIndex((j) => j.id === active.id);
    const newIndex = jobs.findIndex((j) => j.id === over.id);
    persistOrder(jobs, arrayMove(jobs, oldIndex, newIndex));
  }

  function handleMove(id: string, direction: "up" | "down") {
    const index = jobs.findIndex((j) => j.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= jobs.length) return;
    persistOrder(jobs, arrayMove(jobs, index, target));
  }

  function handleMoveToEdge(id: string, edge: "top" | "bottom") {
    const index = jobs.findIndex((j) => j.id === id);
    if (index < 0) return;
    persistOrder(jobs, arrayMove(jobs, index, edge === "top" ? 0 : jobs.length - 1));
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(filteredJobs.map((j) => j.id)) : new Set());
  }

  function handleBulkDelete() {
    setBulkError(null);
    const ids = [...selectedIds];
    startBulkDeleteTransition(() => {
      bulkDeleteJobs(ids).then((result) => {
        if (result?.error) {
          setBulkError("Couldn't delete the selected jobs, try again.");
        } else {
          setSelectedIds(new Set());
        }
      });
    });
  }

  const allVisibleSelected = filteredJobs.length > 0 && filteredJobs.every((j) => selectedIds.has(j.id));
  const someVisibleSelected = filteredJobs.some((j) => selectedIds.has(j.id));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Input
            placeholder="Search by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as DisplayStatus | "all") ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-[var(--admin-text-muted)]">
          {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--admin-border)] bg-[var(--admin-brand-soft)] px-3 py-2">
          <span className="text-sm font-medium text-[var(--admin-text)]">
            {selectedIds.size} selected
          </span>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm">
                  Delete selected
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} job postings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes {selectedIds.size}{" "}
                  {selectedIds.size === 1 ? "job posting" : "job postings"}. This can&apos;t be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={bulkDeletePending}
                  onClick={handleBulkDelete}
                >
                  {bulkDeletePending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {reorderError && (
        <p className="mb-3 rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
          {reorderError}
        </p>
      )}
      {bulkError && (
        <p className="mb-3 rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
          {bulkError}
        </p>
      )}

      <div className="max-h-[min(65vh,720px)] overflow-y-auto overflow-x-auto rounded-lg border border-[var(--admin-border)]">
        <DndContext
          id="jobs-reorder"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table className="w-full">
            <TableHeader>
              <TableRow className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-[var(--admin-surface)]">
                {canWrite && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                      aria-label="Select all jobs"
                    />
                  </TableHead>
                )}
                <TableHead>Order</TableHead>
                <SortableHead column="title" label="Title" sort={sort} onSort={handleSort} />
                <SortableHead column="status" label="Status" sort={sort} onSort={handleSort} />
                <SortableHead column="updated" label="Updated" sort={sort} onSort={handleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={filteredJobs.map((j) => j.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredJobs.map((job, index) => (
                  <SortableRow
                    key={job.id}
                    job={job}
                    position={jobs.findIndex((j) => j.id === job.id) + 1}
                    total={jobs.length}
                    canWrite={canWrite}
                    canReorder={canReorder}
                    selected={selectedIds.has(job.id)}
                    onToggleSelect={toggleSelect}
                    onMove={handleMove}
                    onMoveToEdge={handleMoveToEdge}
                    onEdit={onEdit}
                    registerRowTrigger={registerRowTrigger}
                    isFirst={index === 0}
                    isLast={index === filteredJobs.length - 1}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {filteredJobs.length === 0 && jobs.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--admin-border)] py-10 text-center">
          <p className="text-sm text-[var(--admin-text-muted)]">No job postings yet.</p>
          {canWrite && <Button onClick={onNew}>New job</Button>}
        </div>
      )}
      {filteredJobs.length === 0 && jobs.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--admin-border)] py-10 text-center">
          <p className="text-sm text-[var(--admin-text-muted)]">No jobs match your search.</p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
