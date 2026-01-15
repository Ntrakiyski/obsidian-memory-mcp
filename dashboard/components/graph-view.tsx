"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"

interface GraphNode {
  id: string
  label: string
  size: number
  category: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface GraphViewProps {
  data: GraphData
  onNodeClick?: (id: string) => void
  activeNodeId?: string
}

const categoryColors: Record<string, string> = {
  daily: "#2563eb",
  project: "#8b5cf6",
  research: "#10b981",
}

export function GraphView({ data, onNodeClick, activeNodeId }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const nodesRef = useRef<GraphNode[]>([])
  const linksRef = useRef<{ source: GraphNode; target: GraphNode }[]>([])
  const animationRef = useRef<number>()
  const draggingRef = useRef<GraphNode | null>(null)
  const isPanningRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Initialize nodes with positions
    nodesRef.current = data.nodes.map((node, i) => ({
      ...node,
      x: width / 2 + Math.cos((i / data.nodes.length) * Math.PI * 2) * 150,
      y: height / 2 + Math.sin((i / data.nodes.length) * Math.PI * 2) * 150,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }))

    // Create links with node references
    const nodeMap = new Map(nodesRef.current.map((n) => [n.id, n]))
    linksRef.current = data.links
      .map((link) => ({
        source: nodeMap.get(typeof link.source === "string" ? link.source : link.source.id)!,
        target: nodeMap.get(typeof link.target === "string" ? link.target : link.target.id)!,
      }))
      .filter((l) => l.source && l.target)

    const simulate = () => {
      const nodes = nodesRef.current
      const links = linksRef.current
      const centerX = width / 2
      const centerY = height / 2

      // Apply forces
      nodes.forEach((node) => {
        if (node.fx !== null && node.fx !== undefined) {
          node.x = node.fx
          node.vx = 0
        }
        if (node.fy !== null && node.fy !== undefined) {
          node.y = node.fy
          node.vy = 0
        }

        // Center force
        node.vx! += (centerX - node.x!) * 0.001
        node.vy! += (centerY - node.y!) * 0.001

        // Repulsion between nodes
        nodes.forEach((other) => {
          if (node === other) return
          const dx = node.x! - other.x!
          const dy = node.y! - other.y!
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 1000 / (dist * dist)
          node.vx! += (dx / dist) * force
          node.vy! += (dy / dist) * force
        })
      })

      // Link forces
      links.forEach((link) => {
        const dx = link.target.x! - link.source.x!
        const dy = link.target.y! - link.source.y!
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 120) * 0.01
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        link.source.vx! += fx
        link.source.vy! += fy
        link.target.vx! -= fx
        link.target.vy! -= fy
      })

      // Update positions
      nodes.forEach((node) => {
        if (node.fx === null || node.fx === undefined) {
          node.vx! *= 0.9
          node.x! += node.vx
        }
        if (node.fy === null || node.fy === undefined) {
          node.vy! *= 0.9
          node.y! += node.vy
        }
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(zoom, zoom)

      // Draw links
      ctx.strokeStyle = "#d1d5db"
      ctx.lineWidth = 1.5
      linksRef.current.forEach((link) => {
        ctx.beginPath()
        ctx.moveTo(link.source.x!, link.source.y!)
        ctx.lineTo(link.target.x!, link.target.y!)
        ctx.stroke()
      })

      // Draw nodes
      nodesRef.current.forEach((node) => {
        const radius = Math.max(8, node.size * 2.5)
        const isActive = node.id === activeNodeId

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2)
        ctx.fillStyle = categoryColors[node.category] || "#8b5cf6"
        if (isActive) {
          ctx.shadowColor = categoryColors[node.category] || "#8b5cf6"
          ctx.shadowBlur = 15
        }
        ctx.fill()
        ctx.shadowBlur = 0

        // Border
        ctx.strokeStyle = isActive ? "#ffffff" : "rgba(255,255,255,0.8)"
        ctx.lineWidth = isActive ? 3 : 2
        ctx.stroke()

        // Label
        ctx.fillStyle = "#1f2937"
        ctx.font = "500 11px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(node.label, node.x!, node.y! + radius + 14)
      })

      ctx.restore()
    }

    const animate = () => {
      simulate()
      draw()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [data, zoom, offset, activeNodeId])

  const getNodeAtPosition = (x: number, y: number) => {
    const transformedX = (x - offset.x) / zoom
    const transformedY = (y - offset.y) / zoom

    for (const node of nodesRef.current) {
      const radius = Math.max(8, node.size * 2.5)
      const dx = transformedX - node.x!
      const dy = transformedY - node.y!
      if (dx * dx + dy * dy < radius * radius) {
        return node
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const node = getNodeAtPosition(x, y)
    if (node) {
      draggingRef.current = node
      node.fx = node.x
      node.fy = node.y
    } else {
      isPanningRef.current = true
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMouseRef.current.x
    const dy = e.clientY - lastMouseRef.current.y

    if (draggingRef.current) {
      draggingRef.current.fx! += dx / zoom
      draggingRef.current.fy! += dy / zoom
    } else if (isPanningRef.current) {
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }

    lastMouseRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    if (draggingRef.current) {
      draggingRef.current.fx = null
      draggingRef.current.fy = null
      draggingRef.current = null
    }
    isPanningRef.current = false
  }

  const handleClick = (e: React.MouseEvent) => {
    if (draggingRef.current || isPanningRef.current) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const node = getNodeAtPosition(x, y)
    if (node) {
      onNodeClick?.(node.id)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.min(3, Math.max(0.3, z * delta)))
  }

  const resetView = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-muted/30 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
          className="p-2 bg-background rounded-md shadow-md hover:bg-accent transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
          className="p-2 bg-background rounded-md shadow-md hover:bg-accent transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-background rounded-md shadow-md hover:bg-accent transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
        <p className="text-xs font-medium text-foreground mb-2">Categories</p>
        <div className="space-y-1.5">
          {Object.entries(categoryColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
