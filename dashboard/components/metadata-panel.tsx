"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetadataProps {
  fileName: string
  metadata: Record<string, any>
  onLinkClick?: (id: string) => void
}

export function MetadataPanel({ fileName, metadata, onLinkClick }: MetadataProps) {
  const defaultFields = ["wordCount", "charCount", "created", "modified"]
  const customFields = Object.keys(metadata).filter((key) => !defaultFields.includes(key))

  const renderValue = (value: any) => {
    if (typeof value === "string" || typeof value === "number") {
      return <span className="text-foreground">{value}</span>
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? (
        <div className="space-y-1">
          {value.map((item, i) => (
            <button
              key={i}
              onClick={() => onLinkClick?.(item)}
              className={cn(
                "block w-full text-left px-2 py-1 rounded text-sm",
                "text-primary hover:bg-primary/10 transition-colors",
                "truncate",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">None</span>
      )
    }
    return <span className="text-foreground">{JSON.stringify(value)}</span>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* File Info Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" />
            File Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground font-medium truncate max-w-[150px]">{fileName}</span>
            </div>
            {defaultFields.map((field) => {
              const value = metadata[field]
              if (value === undefined) return null
              const label =
                field
                  .replace(/([A-Z])/g, " $1")
                  .toLowerCase()
                  .charAt(0)
                  .toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")
              return (
                <div key={field} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  {renderValue(value)}
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom Fields Section */}
        {customFields.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Custom Fields</h3>
            {customFields.map((field) => {
              const value = metadata[field]
              const label =
                field
                  .replace(/([A-Z])/g, " $1")
                  .toLowerCase()
                  .charAt(0)
                  .toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")

              return (
                <div key={field} className="mb-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">{label}</h4>
                  {Array.isArray(value) && value.length > 0 ? (
                    <div className="space-y-1">{renderValue(value)}</div>
                  ) : Array.isArray(value) ? (
                    <p className="text-sm text-muted-foreground">No items</p>
                  ) : (
                    renderValue(value)
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
