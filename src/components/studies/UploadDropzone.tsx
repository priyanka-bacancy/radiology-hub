"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type UploadStatus = "queued" | "uploading" | "success" | "error"

type UploadItem = {
  id: string
  name: string
  progress: number
  status: UploadStatus
  error?: string
}

type UploadDropzoneProps = {
  onUploaded?: () => void
}

function uploadDicomFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)

    xhr.open("POST", "/api/dicom/upload")

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const progress = Math.round((event.loaded / event.total) * 100)
      onProgress(progress)
    }

    xhr.onerror = () => reject(new Error("Network error during upload"))

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
        return
      }

      try {
        const parsed = JSON.parse(xhr.responseText) as { error?: string }
        reject(new Error(parsed.error || "Upload failed"))
      } catch {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.send(formData)
  })
}

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const router = useRouter()
  const [isDragging, setIsDragging] = React.useState(false)
  const [items, setItems] = React.useState<UploadItem[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  const runBatchUpload = React.useCallback(
    async (files: File[]) => {
      if (!files.length) return

      const newItems: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        progress: 0,
        status: "queued",
      }))

      setItems((prev) => [...newItems, ...prev])

      await Promise.allSettled(
        newItems.map(async (item, index) => {
          const file = files[index]
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: "uploading" } : p))
          )

          try {
            await uploadDicomFile(file, (progress) => {
              setItems((prev) =>
                prev.map((p) => (p.id === item.id ? { ...p, progress } : p))
              )
            })

            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, progress: 100, status: "success" } : p
              )
            )
          } catch (error) {
            const message = error instanceof Error ? error.message : "Upload failed"
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, status: "error", error: message, progress: 0 }
                  : p
              )
            )
          }
        })
      )

      if (onUploaded) {
        onUploaded()
      } else {
        router.refresh()
      }
    },
    [onUploaded, router]
  )

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return

      const files = Array.from(fileList).filter((file) =>
        file.name.toLowerCase().endsWith(".dcm")
      )
      void runBatchUpload(files)
    },
    [runBatchUpload]
  )

  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      handleFiles(event.dataTransfer.files)
    },
    [handleFiles]
  )

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 text-left transition-all",
          "bg-white/90 shadow-sm hover:shadow-md",
          isDragging
            ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-200"
            : "border-slate-200"
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border",
                isDragging
                  ? "border-blue-200 bg-blue-100 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              )}
            >
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Upload or drag and drop DICOMs
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Supports multiple `.dcm` files. We will auto-create placeholder
                study data on ingest.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border bg-white px-2.5 py-1">
                  Secure storage
                </span>
                <span className="rounded-full border bg-white px-2.5 py-1">
                  Fast upload
                </span>
                <span className="rounded-full border bg-white px-2.5 py-1">
                  Auto indexing
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="min-w-[160px]"
              onClick={() => inputRef.current?.click()}
            >
              Select Files
            </Button>
            <p className="text-xs text-slate-500">
              Or drop files anywhere in this panel
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".dcm,application/dicom"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.currentTarget.value = ""
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p
                  className={cn(
                    "text-xs",
                    item.status === "success" && "text-green-600",
                    item.status === "error" && "text-destructive",
                    (item.status === "queued" || item.status === "uploading") &&
                      "text-muted-foreground"
                  )}
                >
                  {item.status === "success" && "Done"}
                  {item.status === "error" && (item.error || "Failed")}
                  {item.status === "queued" && "Queued"}
                  {item.status === "uploading" && `${item.progress}%`}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div
                  className={cn(
                    "h-full transition-all",
                    item.status === "error" ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UploadDropzone
