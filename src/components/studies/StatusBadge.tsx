import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StudyStatus = "unread" | "in_progress" | "reported" | "verified" | "amended"

type StatusBadgeProps = {
  status: StudyStatus
  className?: string
}

const statusClasses: Record<StudyStatus, string> = {
  unread: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  reported: "bg-green-100 text-green-700 border-green-200",
  verified: "bg-green-100 text-green-700 border-green-200 font-bold",
  amended: "bg-orange-100 text-orange-700 border-orange-200",
}

const statusLabel: Record<StudyStatus, string> = {
  unread: "Unread",
  in_progress: "In Progress",
  reported: "Reported",
  verified: "Verified",
  amended: "Amended",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(statusClasses[status], className)}>
      {statusLabel[status]}
    </Badge>
  )
}
