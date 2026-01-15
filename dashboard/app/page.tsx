"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Search, Settings, Network, Menu, X, Info, Loader2, AlertCircle } from "lucide-react"
import { FileTree } from "@/components/file-tree"
import { Editor } from "@/components/editor"
import { GraphView } from "@/components/graph-view"
import { MetadataPanel } from "@/components/metadata-panel"
import { findFile, getFileMetadata, TreeNode } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function ObsidianVault() {
  // Data state
  const [folders, setFolders] = useState<TreeNode[]>([])
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [activeFileId, setActiveFileId] = useState<string | undefined>(undefined)
  const [content, setContent] = useState("")
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showGraphPanel, setShowGraphPanel] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [editorWidth, setEditorWidth] = useState(60)
  const [metadataWidth, setMetadataWidth] = useState(320)

  const [resizingPanel, setResizingPanel] = useState<"sidebar" | "editor" | "metadata" | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [showFolderNameInput, setShowFolderNameInput] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mainContainerRef = useRef<HTMLDivElement>(null)

  // Fetch nodes from API
  useEffect(() => {
    async function fetchNodes() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch("/api/nodes")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch nodes")
        }

        setFolders(data.nodes || [])
        setFileContents(data.fileContents || {})
        setGraphData(data.graphData || { nodes: [], links: [] })

        // Set first file as active if available
        const firstFile = findFirstFile(data.nodes || [])
        if (firstFile && firstFile.id) {
          setActiveFileId(firstFile.id)
          setContent((data.fileContents || {})[firstFile.id] || "")
        }
      } catch (err) {
        console.error("Error fetching nodes:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchNodes()
  }, [])

  // Helper to find first file in tree
  const findFirstFile = useCallback((nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) {
      if (node.type === "file" && node.id) {
        return node
      }
      if (node.children) {
        const found = findFirstFile(node.children)
        if (found) return found
      }
    }
    return null
  }, [])

  const currentFileName = useMemo(() => {
    if (!activeFileId) return "No file selected"
    return findFile(folders, activeFileId) || "Untitled"
  }, [activeFileId, folders])

  const metadata = useMemo(() => {
    if (!activeFileId) return undefined
    return getFileMetadata(activeFileId, fileContents)
  }, [activeFileId, fileContents])

  const handleSelectFile = (id: string) => {
    setActiveFileId(id)
    setContent(fileContents[id] || "")
    setIsDirty(false)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setIsDirty(true)
  }

  const handleSave = () => {
    setIsDirty(false)
  }

  const handleLinkClick = (linkId: string) => {
    if (fileContents[linkId]) {
      handleSelectFile(linkId)
    }
  }

  const handleRename = (id: string, newName: string, type: "file" | "folder") => {
    const newStructure = JSON.parse(JSON.stringify(folders))

    const renameItem = (items: any[]): boolean => {
      for (const item of items) {
        if (type === "file" && item.id === id) {
          item.name = newName.endsWith(".md") ? newName : `${newName}.md`
          return true
        }
        if (type === "folder" && item.type === "folder" && item.name === id) {
          item.name = newName
          return true
        }
        if (item.children && renameItem(item.children)) {
          return true
        }
      }
      return false
    }

    renameItem(newStructure)
    setFolders(newStructure)
  }

  const handleCreateNew = (type: "file" | "folder", parentFolder?: string, customName?: string) => {
    const timestamp = new Date().toISOString().split("T")[0]

    if (type === "file") {
      const fileName = parentFolder ? `New Page in ${parentFolder}.md` : `new-page-${timestamp}.md`
      const newFileId = `new-${Date.now()}`
      fileContents[newFileId] = `# ${fileName.replace(".md", "")}`

      const newStructure = JSON.parse(JSON.stringify(folders))

      const addFileToFolder = (items: any): boolean => {
        for (const item of items) {
          if (item.type === "folder" && item.name === parentFolder) {
            if (!item.children) item.children = []
            item.children.push({
              name: fileName,
              type: "file",
              id: newFileId,
            })
            return true
          }
          if (item.children && addFileToFolder(item.children)) {
            return true
          }
        }
        return false
      }

      if (parentFolder) {
        addFileToFolder(newStructure)
      } else {
        newStructure.push({
          name: fileName,
          type: "file",
          id: newFileId,
        })
      }

      setFolders(newStructure)
      handleSelectFile(newFileId)
    } else {
      const folderName = customName || `New Folder ${Date.now()}`
      const newStructure = JSON.parse(JSON.stringify(folders))
      newStructure.push({
        name: folderName,
        type: "folder",
        expanded: true,
        children: [],
      })
      setFolders(newStructure)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingPanel) return

      if (resizingPanel === "sidebar" && mainContainerRef.current) {
        const newWidth = e.clientX
        if (newWidth >= 180 && newWidth <= 400) {
          setSidebarWidth(newWidth)
        }
      } else if (resizingPanel === "editor" && containerRef.current) {
        const container = containerRef.current
        const rect = container.getBoundingClientRect()
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100
        if (newWidth >= 30 && newWidth <= 70) {
          setEditorWidth(newWidth)
        }
      } else if (resizingPanel === "metadata" && containerRef.current) {
        const container = containerRef.current
        const rect = container.getBoundingClientRect()
        const newWidth = rect.right - e.clientX
        if (newWidth >= 200 && newWidth <= 500) {
          setMetadataWidth(newWidth)
        }
      }
    }

    const handleMouseUp = () => {
      setResizingPanel(null)
    }

    if (resizingPanel) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [resizingPanel])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Obsidian vault...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 max-w-md text-center px-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Failed to load data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">📓</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">Obsidian Vault</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9 pr-4 py-2 text-sm rounded-lg",
                "bg-muted/50 border border-border",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowGraphPanel(!showGraphPanel)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title={showGraphPanel ? "Hide graph" : "Show graph"}
          >
            <Network className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="p-2 hover:bg-accent rounded-lg transition-colors hidden md:flex"
            title={showRightPanel ? "Hide metadata" : "Show metadata"}
          >
            <Info className="h-5 w-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div ref={mainContainerRef} className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <aside
              className="border-r border-border bg-sidebar shrink-0 overflow-y-auto"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="p-2 h-full">
                <FileTree
                  items={folders}
                  onSelectFile={handleSelectFile}
                  onCreateNew={handleCreateNew}
                  onRename={handleRename}
                  activeFileId={activeFileId}
                  searchQuery={searchQuery}
                />
              </div>
            </aside>
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors shrink-0"
              onMouseDown={() => setResizingPanel("sidebar")}
            />
          </>
        )}

        {/* Overlay for mobile sidebar */}
        {showSidebar && (
          <div className="fixed inset-0 bg-background/80 z-10 lg:hidden" onClick={() => setShowSidebar(false)} />
        )}

        {/* Content Area */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden min-w-0">
          {/* Editor Section */}
          <div
            className="flex flex-col overflow-hidden min-w-0"
            style={{
              width: !showGraphPanel && !showRightPanel ? "100%" : showGraphPanel ? `${editorWidth}%` : "100%",
              flex: !showGraphPanel && !showRightPanel ? "1" : undefined,
            }}
          >
            <Editor
              fileName={currentFileName}
              fileId={activeFileId}
              content={content}
              onChange={handleContentChange}
              isDirty={isDirty}
              onSave={handleSave}
              onRename={activeFileId ? (newName) => handleRename(activeFileId, newName, "file") : undefined}
            />
          </div>

          {/* Graph Panel with resize handle */}
          {showGraphPanel && (
            <>
              <div
                className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors shrink-0"
                onMouseDown={() => setResizingPanel("editor")}
              />
              <div
                className="overflow-hidden min-w-0"
                style={{
                  width: showRightPanel ? `calc(${100 - editorWidth}% - ${metadataWidth}px)` : `${100 - editorWidth}%`,
                }}
              >
                <GraphView data={graphData} onNodeClick={handleLinkClick} activeNodeId={activeFileId} />
              </div>
            </>
          )}

          {/* Metadata Panel with resize handle */}
          {showRightPanel && (
            <>
              <div
                className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors shrink-0"
                onMouseDown={() => setResizingPanel("metadata")}
              />
              <div className="shrink-0 overflow-y-auto" style={{ width: `${metadataWidth}px` }}>
                <MetadataPanel fileName={currentFileName} metadata={metadata || {}} />
              </div>
            </>
          )}
        </div>
      </div>

      {showFolderNameInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-semibold">New Folder</h3>
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateNew("folder", undefined, newFolderName)
                  setShowFolderNameInput(false)
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
                  handleCreateNew("folder", undefined, newFolderName)
                  setShowFolderNameInput(false)
                  setNewFolderName("")
                }}
                className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowFolderNameInput(false)
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
    </div>
  )
}
