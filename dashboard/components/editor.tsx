"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { useEffect, useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code2,
  ImageIcon,
  Type,
  Copy,
  Save,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react"

const lowlight = createLowlight(common)

interface EditorProps {
  content: string
  onChange: (content: string) => void
  fileName?: string
  fileId?: string
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  onRename?: (newName: string) => void
}

interface SlashCommand {
  title: string
  description: string
  icon: React.ReactNode
  action: (editor: any) => void
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return ""

  let html = markdown

  // Convert headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>")

  // Convert bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>")
  html = html.replace(/_(.+?)_/g, "<em>$1</em>")

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Convert links - handle wiki-style links [[id|text]]
  html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="#$1">$2</a>')
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="#$1">$1</a>')

  // Convert standard markdown links [text](url)
  html = html.replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2">$1</a>')

  // Convert images
  html = html.replace(/!\[([^\]]*)\]$$([^)]+)$$/g, '<img src="$2" alt="$1" />')

  // Convert horizontal rules
  html = html.replace(/^---$/gm, "<hr />")
  html = html.replace(/^\*\*\*$/gm, "<hr />")

  // Convert blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")

  // Convert unordered lists
  const lines = html.split("\n")
  let inList = false
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const listMatch = line.match(/^[-*+] (.+)$/)
    const taskMatch = line.match(/^[-*+] \[([ x])\] (.+)$/)

    if (taskMatch) {
      if (!inList) {
        result.push('<ul data-type="taskList">')
        inList = true
      }
      const checked = taskMatch[1] === "x" ? ' data-checked="true"' : ""
      result.push(`<li data-type="taskItem"${checked}><p>${taskMatch[2]}</p></li>`)
    } else if (listMatch) {
      if (!inList) {
        result.push("<ul>")
        inList = true
      }
      result.push(`<li><p>${listMatch[1]}</p></li>`)
    } else {
      if (inList) {
        result.push("</ul>")
        inList = false
      }
      // Wrap non-empty lines that aren't already HTML tags in paragraphs
      if (line.trim() && !line.match(/^<[^>]+>/)) {
        result.push(`<p>${line}</p>`)
      } else if (line.trim()) {
        result.push(line)
      }
    }
  }

  if (inList) {
    result.push("</ul>")
  }

  return result.join("")
}

const slashCommands: SlashCommand[] = [
  {
    title: "Text",
    description: "Just start writing with plain text",
    icon: <Type className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: <Heading1 className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <List className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <ListOrdered className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list",
    icon: <CheckSquare className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Capture a quote",
    icon: <Quote className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Divider",
    description: "Visual divider line",
    icon: <Minus className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Code Block",
    description: "Add a code snippet",
    icon: <Code2 className="h-4 w-4" />,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Image",
    description: "Embed an image",
    icon: <ImageIcon className="h-4 w-4" />,
    action: (editor) => {
      const url = window.prompt("Enter image URL")
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
  },
  {
    title: "Link",
    description: "Add a link",
    icon: <LinkIcon className="h-4 w-4" />,
    action: (editor) => {
      const url = window.prompt("Enter URL")
      if (url) {
        editor.chain().focus().setLink({ href: url }).run()
      }
    },
  },
]

export function Editor({ content, onChange, fileName, fileId, isDirty, isSaving, onSave, onRename }: EditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const [slashFilter, setSlashFilter] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [formatMenuPosition, setFormatMenuPosition] = useState({ top: 0, left: 0 })
  const [copied, setCopied] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const editorRef = useRef<HTMLDivElement>(null)
  const [currentFileId, setCurrentFileId] = useState(fileId)

  const htmlContent = markdownToHtml(content)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-full p-6",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/" && !showSlashMenu) {
          const { from } = view.state.selection
          const coords = view.coordsAtPos(from)
          const editorRect = editorRef.current?.getBoundingClientRect()

          if (editorRect) {
            setSlashMenuPosition({
              top: coords.top - editorRect.top + 24,
              left: coords.left - editorRect.left,
            })
          }
          setTimeout(() => {
            setShowSlashMenu(true)
            setSlashFilter("")
            setSelectedIndex(0)
          }, 0)
        }

        if (showSlashMenu) {
          if (event.key === "Escape") {
            setShowSlashMenu(false)
            return true
          }
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
            return true
          }
          if (event.key === "ArrowUp") {
            event.preventDefault()
            setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
            return true
          }
          if (event.key === "Enter") {
            event.preventDefault()
            if (filteredCommands[selectedIndex]) {
              executeCommand(filteredCommands[selectedIndex])
            }
            return true
          }
          if (event.key === "Backspace" && slashFilter === "") {
            setShowSlashMenu(false)
          }
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            setSlashFilter((prev) => prev + event.key)
          }
          if (event.key === "Backspace" && slashFilter.length > 0) {
            setSlashFilter((prev) => prev.slice(0, -1))
          }
        }

        return false
      },
    },
  })

  useEffect(() => {
    if (editor && fileId !== currentFileId) {
      const newHtmlContent = markdownToHtml(content)
      editor.commands.setContent(newHtmlContent)
      setCurrentFileId(fileId)
    }
  }, [content, fileId, currentFileId, editor])

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editor) return

      const { from, to } = editor.state.selection
      if (from !== to) {
        const coords = editor.view.coordsAtPos(from)
        const editorRect = editorRef.current?.getBoundingClientRect()

        if (editorRect) {
          setFormatMenuPosition({
            top: coords.top - editorRect.top - 40,
            left: coords.left - editorRect.left,
          })
          setShowFormatMenu(true)
        }
      } else {
        setShowFormatMenu(false)
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [editor])

  const filteredCommands = slashCommands.filter((cmd) => cmd.title.toLowerCase().includes(slashFilter.toLowerCase()))

  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: editor.state.selection.from - 1 - slashFilter.length, to: editor.state.selection.from })
          .run()
        command.action(editor)
        setShowSlashMenu(false)
        setSlashFilter("")
      }
    },
    [editor, slashFilter],
  )

  const copyToClipboard = useCallback(() => {
    if (editor) {
      const markdown = editor.getText()
      navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [editor])

  const handleNameSubmit = () => {
    if (editedName.trim() && onRename) {
      onRename(editedName.trim())
    }
    setIsEditingName(false)
  }

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit()
                if (e.key === "Escape") setIsEditingName(false)
              }}
              className="px-2 py-1 text-sm bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <button onClick={handleNameSubmit} className="p-1 hover:bg-accent rounded">
              <Check className="h-4 w-4 text-green-500" />
            </button>
            <button onClick={() => setIsEditingName(false)} className="p-1 hover:bg-accent rounded">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <span className="text-sm font-medium text-foreground">{fileName}</span>
            <button
              onClick={() => {
                setEditedName(fileName?.replace(".md", "") || "")
                setIsEditingName(true)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
              title="Rename file"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            {isDirty && <span className="text-xs text-muted-foreground">(unsaved)</span>}
          </div>
        )}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving || !isDirty}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                isSaving || !isDirty
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              title="Save changes"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
              "bg-muted hover:bg-accent",
            )}
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div ref={editorRef} className="flex-1 overflow-y-auto relative">
        <EditorContent editor={editor} className="h-full" />

        {/* Slash Command Menu */}
        {showSlashMenu && (
          <div
            className="absolute z-50 w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
            style={{
              top: slashMenuPosition.top,
              left: slashMenuPosition.left,
            }}
          >
            <div className="p-2 border-b border-border">
              <span className="text-xs text-muted-foreground">
                {slashFilter ? `Filtering: ${slashFilter}` : "Type to filter..."}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.title}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/50",
                  )}
                  onClick={() => executeCommand(command)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">{command.icon}</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{command.title}</div>
                    <div className="text-xs text-muted-foreground">{command.description}</div>
                  </div>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No commands found</div>
              )}
            </div>
          </div>
        )}

        {/* Inline Format Menu */}
        {showFormatMenu && (
          <div
            className="absolute z-50 flex items-center gap-1 p-1 bg-popover border border-border rounded-lg shadow-lg"
            style={{
              top: formatMenuPosition.top,
              left: formatMenuPosition.left,
            }}
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("p-1.5 rounded hover:bg-accent", editor.isActive("bold") && "bg-accent")}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("p-1.5 rounded hover:bg-accent", editor.isActive("italic") && "bg-accent")}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn("p-1.5 rounded hover:bg-accent", editor.isActive("strike") && "bg-accent")}
            >
              <Strikethrough className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn("p-1.5 rounded hover:bg-accent", editor.isActive("code") && "bg-accent")}
            >
              <Code className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const url = window.prompt("Enter URL")
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
              }}
              className={cn("p-1.5 rounded hover:bg-accent", editor.isActive("link") && "bg-accent")}
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
