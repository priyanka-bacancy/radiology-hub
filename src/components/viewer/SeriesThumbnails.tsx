"use client"

import { cn } from "@/lib/utils"

export type ViewerSeries = {
  id: string
  description: string | null
  imageCount: number
  thumbnailUrl?: string | null
}

type SeriesThumbnailsProps = {
  series: ViewerSeries[]
  selectedSeriesId?: string
  onSeriesSelect: (seriesId: string) => void
}

export default function SeriesThumbnails({
  series,
  selectedSeriesId,
  onSeriesSelect,
}: SeriesThumbnailsProps) {
  return (
    <div className="w-full border-t bg-slate-950/95 p-3">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {series.map((item) => {
          const isSelected = item.id === selectedSeriesId

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSeriesSelect(item.id)}
              className={cn(
                "min-w-44 rounded-md border p-2 text-left transition-colors",
                isSelected
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-500"
              )}
            >
              <div className="mb-2 h-20 w-full overflow-hidden rounded bg-slate-800">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.description || "Series thumbnail"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No preview
                  </div>
                )}
              </div>
              <p className="truncate text-sm font-medium text-slate-100">
                {item.description || "Untitled series"}
              </p>
              <p className="mt-1 text-xs text-slate-400">{item.imageCount} images</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
