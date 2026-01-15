"use client"

import type React from "react"

import { useState } from "react"
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Plus, Pencil, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/lib/mock-data"

interface FileTreeProps {
  items: TreeNode[]
  onSelectFile: (id: string) => void
  onCreateNew?: (type: "file" | "folder", parentFolder?: string, customName?: string) => void
  onRename?: (id: string, newName: string, type: "file" | "folder") => void
  activeFileId?: string
  searchQuery?: string
}

export function FileTree({
  items,
  onSelectFile,
  onCreateNew,
  onRename,
  activeFileId,
  searchQuery = "",
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "Daily Notes": true,
    Research: true,
  })
  const [newFolderName, setNewFolderName] = useState("")
  const [showFolderInput, setShowFolderInput] = useState(false)
  const [editingItem, setEditingItem] = useState<{ id: string; type: "file" | "folder"; name: string } | null>(null)

  const toggleFolder = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const matchesSearch = (name: string) => {
    if (!searchQuery) return true
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  }

  const hasMatchingChildren = (item: TreeNode): boolean => {
    if (item.type === "file") return matchesSearch(item.name)
    if (!item.children) return false
    return item.children.some((child) => hasMatchingChildren(child))
  }

  const handleFolderPlus = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onCreateNew?.("file", folderName)
  }

  const handleRenameSubmit = () => {
    if (editingItem && editingItem.name.trim()) {
      onRename?.(editingItem.id, editingItem.name, editingItem.type)
    }
    setEditingItem(null)
  }

  const renderItem = (item: TreeNode, depth = 0) => {
    if (!hasMatchingChildren(item)) return null

    if (item.type === "folder") {
      const isExpanded = expanded[item.name] ?? item.expanded ?? false
      const shouldAutoExpand = searchQuery && hasMatchingChildren(item)
      const isEditing = editingItem?.type === "folder" && editingItem?.id === item.name

      return (
        <div key={item.name}>
          <div className="flex items-center group">
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1 px-2 py-1" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit()
                    if (e.key === "Escape") setEditingItem(null)
                  }}
                  className="flex-1 px-2 py-0.5 text-sm bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button onClick={handleRenameSubmit} className="p-1 hover:bg-accent rounded">
                  <Check className="h-3 w-3 text-green-500" />
                </button>
                <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-accent rounded">
                  <X className="h-3 w-3 text-red-500" />
                </button>
              </div>
            ) : (
              <>
                <button
                  className={cn(
                    "flex flex-1 items-center gap-2 px-2 py-1.5 text-sm transition-colors duration-150",
                    "hover:bg-accent rounded-md",
                  )}
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  onClick={() => toggleFolder(item.name)}
                >
                  <span className="text-muted-foreground transition-transform duration-200">
                    {isExpanded || shouldAutoExpand ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {isExpanded || shouldAutoExpand ? (
                      <FolderOpen className="h-4 w-4" />
                    ) : (
                      <Folder className="h-4 w-4" />
                    )}
                  </span>
                  <span className="font-medium text-foreground">{item.name}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingItem({ id: item.name, type: "folder", name: item.name })
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                  title="Rename folder"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => handleFolderPlus(item.name, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded mr-2"
                  title="Create new file"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              isExpanded || shouldAutoExpand ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            {item.children?.map((child) => renderItem(child, depth + 1))}
          </div>
        </div>
      )
    }

    const isActive = activeFileId === item.id
    const isMatch = searchQuery && matchesSearch(item.name)
    const isEditing = editingItem?.type === "file" && editingItem?.id === item.id

    return (
      <div key={item.id} className="flex items-center group">
        {isEditing ? (
          <div
            className="flex items-center gap-1 flex-1 px-2 py-1"
            style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit()
                if (e.key === "Escape") setEditingItem(null)
              }}
              className="flex-1 px-2 py-0.5 text-sm bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={handleRenameSubmit} className="p-1 hover:bg-accent rounded">
              <Check className="h-3 w-3 text-green-500" />
            </button>
            <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-accent rounded">
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <button
              className={cn(
                "flex flex-1 items-center gap-2 px-2 py-1.5 text-sm transition-all duration-150 rounded-md",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground",
                isMatch && !isActive && "bg-yellow-100 dark:bg-yellow-900/30",
              )}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              onClick={() => onSelectFile(item.id!)}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingItem({ id: item.id!, type: "file", name: item.name.replace(".md", "") })
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded mr-2"
              title="Rename file"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex gap-2">
        <button
          onClick={() => onCreateNew?.("file")}
          className="flex-1 flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
          title="New file"
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
        </button>
        <button
          onClick={() => setShowFolderInput(true)}
          className="flex-1 flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
          title="New folder"
        >
          <Folder className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {showFolderInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-semibold">New Folder</h3>
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  onCreateNew?.("folder", undefined, newFolderName)
                  setShowFolderInput(false)
                  setNewFolderName("")
                }
              }}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-muted border border-border",
                "focus:outline-none focus:ring-2 focus:ring-ring",
              )}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    onCreateNew?.("folder", undefined, newFolderName)
                  }
                  setShowFolderInput(false)
                  setNewFolderName("")
                }}
                className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowFolderInput(false)
                  setNewFolderName("")
                }}
                className="flex-1 px-4 py-2 rounded-md bg-muted hover:bg-accent transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">{items.map((item) => renderItem(item))}</div>
    </div>
  )
}
