"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, FilePenLine } from "lucide-react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/studies/StatusBadge"

type StudyStatus = "unread" | "in_progress" | "reported" | "verified" | "amended"
type StudyPriority = "stat" | "urgent" | "routine"

export type StudyTableRow = {
  id: string
  patientName: string
  mrn: string
  modality: string
  description: string | null
  date: string | null
  status: StudyStatus
  priority: StudyPriority | string
  assignedTo: string | null
}

type StudyFilters = { status: string; modality: string; search: string }

type StudyTableProps = {
  studies: any[]
  filters?: StudyFilters
  onFilterChange?: React.Dispatch<React.SetStateAction<StudyFilters>>
}

const priorityClasses: Record<string, string> = {
  stat: "bg-red-100 text-red-700 border-red-200",
  urgent: "bg-amber-100 text-amber-700 border-amber-200",
  routine: "bg-slate-100 text-slate-700 border-slate-200",
}

export function StudyTable({ studies, filters: controlledFilters, onFilterChange }: StudyTableProps) {
  const router = useRouter()
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  const localFilters = React.useMemo(
    () => ({ status: "all", modality: "all", search: "" }),
    []
  )
  const [internalFilters, setInternalFilters] = React.useState(localFilters)
  const filters = controlledFilters
    ? {
        status: controlledFilters.status || "all",
        modality: controlledFilters.modality || "all",
        search: controlledFilters.search || "",
      }
    : internalFilters

  const setFilters = (next: StudyFilters) => {
    if (controlledFilters && onFilterChange) {
      onFilterChange(next)
      return
    }
    setInternalFilters(next)
  }

  const normalizedStudies = React.useMemo<StudyTableRow[]>(
    () =>
      studies.map((study: any) => ({
        id: study.id,
        patientName: study.patientName ?? study.patients?.full_name ?? "Unknown",
        mrn: study.mrn ?? study.patients?.mrn ?? "-",
        modality: study.modality ?? "-",
        description: study.description ?? study.study_description ?? null,
        date: study.date ?? study.study_date ?? null,
        status: (study.status ?? "unread") as StudyStatus,
        priority: study.priority ?? "routine",
        assignedTo: study.assignedTo ?? study.users?.full_name ?? null,
      })),
    [studies]
  )

  const modalityOptions = React.useMemo(() => {
    const values = Array.from(
      new Set(normalizedStudies.map((s) => s.modality).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b))
  }, [normalizedStudies])

  const filteredStudies = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase()

    return normalizedStudies.filter((study) => {
      if (filters.status !== "all" && study.status !== filters.status) return false
      if (filters.modality !== "all" && study.modality !== filters.modality) return false

      if (!q) return true
      return (
        study.patientName.toLowerCase().includes(q) ||
        study.mrn.toLowerCase().includes(q) ||
        (study.description || "").toLowerCase().includes(q)
      )
    })
  }, [normalizedStudies, filters])

  const columns = React.useMemo<ColumnDef<StudyTableRow>[]>(() => [
    {
      accessorKey: "patientName",
      header: "Patient Name",
    },
    {
      accessorKey: "mrn",
      header: "MRN",
    },
    {
      accessorKey: "modality",
      header: "Modality",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const value = row.original.date
        if (!value) return "-"
        const parsed = new Date(value)
        if (Number.isNaN(parsed.getTime())) return value
        return formatDate(value)
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const value = row.original.priority || "-"
        return (
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
              priorityClasses[value] ?? "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {String(value).toUpperCase()}
          </span>
        )
      },
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      cell: ({ row }) => row.original.assignedTo || "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/studies/${row.original.id}/view`)}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button size="sm" asChild>
            <Link href={`/studies/${row.original.id}/report`}>
              <FilePenLine className="h-3.5 w-3.5" />
              Report
            </Link>
          </Button>
        </div>
      ),
    },
  ], [router])

  const table = useReactTable({
    data: filteredStudies,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-white/80 p-3 shadow-sm backdrop-blur md:grid-cols-3">
        <Input
          value={filters.search}
          onChange={(event) =>
            setFilters({ ...filters, search: event.target.value })
          }
          placeholder="Search by patient, MRN, or description"
        />
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="amended">Amended</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.modality}
          onValueChange={(value) => setFilters({ ...filters, modality: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by modality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modalities</SelectItem>
            {modalityOptions.map((modality) => (
              <SelectItem key={modality} value={modality}>
                {modality}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-slate-50/80 text-slate-600">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No studies found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default StudyTable
