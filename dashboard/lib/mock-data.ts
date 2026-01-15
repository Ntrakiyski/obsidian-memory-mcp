export interface TreeNode {
  name: string
  type: "file" | "folder"
  id?: string
  children?: TreeNode[]
  expanded?: boolean
}

export const folderStructure: TreeNode[] = [
  {
    name: "Daily Notes",
    type: "folder",
    expanded: true,
    children: [
      { name: "2025-01-15.md", type: "file", id: "daily-1" },
      { name: "2025-01-14.md", type: "file", id: "daily-2" },
      { name: "2025-01-13.md", type: "file", id: "daily-3" },
    ],
  },
  {
    name: "Projects",
    type: "folder",
    expanded: false,
    children: [
      {
        name: "Website Redesign",
        type: "folder",
        expanded: false,
        children: [
          { name: "Overview.md", type: "file", id: "project-1" },
          { name: "Design System.md", type: "file", id: "project-2" },
          { name: "Timeline.md", type: "file", id: "project-3" },
        ],
      },
      {
        name: "Mobile App",
        type: "folder",
        expanded: false,
        children: [{ name: "Spec.md", type: "file", id: "project-4" }],
      },
    ],
  },
  {
    name: "Research",
    type: "folder",
    expanded: true,
    children: [
      { name: "React Patterns.md", type: "file", id: "research-1" },
      { name: "D3.js Tips.md", type: "file", id: "research-2" },
      { name: "Web Performance.md", type: "file", id: "research-3" },
    ],
  },
]

export const fileContents: Record<string, string> = {
  "daily-1": `# January 15, 2025

## Morning
- Started building Obsidian vault UI
- Designed the component architecture
- [[research-2|Researched D3.js patterns]]

## Evening
- Implemented file tree component
- Created mock data structure
- Sketched graph visualization

## Tomorrow
- Finish editor component
- Add graph visualization
- Polish styling and animations

## Notes
- Graph libraries: D3.js is powerful
- [[project-1|Website redesign]] progressing well
- Performance tip: memoize expensive renders`,

  "daily-2": `# January 14, 2025

## Tasks
- Reviewed project requirements
- Set up development environment
- Created initial mockups

## Links
- [[daily-1|Tomorrow's notes]]
- [[research-1|React patterns reference]]`,

  "daily-3": `# January 13, 2025

## Planning
- Outlined project scope
- Identified key features
- Researched similar tools`,

  "project-1": `# Website Redesign Overview

## Project Status
- **Phase**: Design & Planning
- **Progress**: 40%
- **Timeline**: Jan 2025 - Apr 2025

## Team
- Designer: Sarah (Lead)
- Developer: You

## Design System
See: [[project-2|Design System document]]

## Key Milestones
1. Design System (Due: Jan 31)
2. Homepage Mockups (Due: Feb 14)
3. Component Library (Due: Feb 28)
4. Development Sprint (Due: Apr 30)

## Links
- Related: [[project-2]]
- Research: [[research-1]]`,

  "project-2": `# Design System

## Colors
- Primary: #2563eb
- Secondary: #8b5cf6
- Background: #ffffff
- Text: #1f2937

## Typography
- Headings: Inter, Bold
- Body: Inter, Regular
- Code: Fira Code

## Components
- Buttons
- Cards
- Forms
- Navigation`,

  "project-3": `# Project Timeline

## Q1 2025
- January: Planning & Design
- February: Development Start
- March: Testing & QA

## Q2 2025
- April: Launch Preparation
- May: Soft Launch
- June: Full Release`,

  "project-4": `# Mobile App Specification

## Overview
Native mobile app for iOS and Android

## Features
- User authentication
- Push notifications
- Offline support
- Dark mode`,

  "research-1": `# React Patterns & Best Practices

## State Management
- Use hooks for local state
- Consider context for global state
- Avoid prop drilling with custom hooks

## Performance
- Memoize expensive components
- Use useCallback for event handlers
- Lazy load components with React.lazy()

## Patterns
- Compound components for flexible APIs
- Render props for logic sharing
- Custom hooks for stateful logic

## Testing
- Test behavior, not implementation
- Use React Testing Library
- Mock external dependencies`,

  "research-2": `# D3.js Graph Visualization Tips

## Force Simulation
- Use d3.forceSimulation() for layout
- Set link distance for spacing
- Adjust charge strength for repulsion
- Center force to keep graph centered

## Performance
- Use canvas rendering for 1000+ nodes
- Debounce zoom/pan events
- Throttle force tick updates

## UX Best Practices
- Make nodes draggable
- Add zoom constraints
- Show tooltips on hover
- Color code by category

## Resources
- Observable: https://observablehq.com/@d3
- Official Docs: https://d3js.org`,

  "research-3": `# Web Performance Guide

## Core Web Vitals
- LCP: Largest Contentful Paint
- FID: First Input Delay
- CLS: Cumulative Layout Shift

## Optimization Techniques
- Code splitting
- Image optimization
- Lazy loading
- Caching strategies

## Tools
- Lighthouse
- WebPageTest
- Chrome DevTools`,
}

export const graphData = {
  nodes: [
    { id: "daily-1", label: "2025-01-15", size: 8, category: "daily" },
    { id: "daily-2", label: "2025-01-14", size: 5, category: "daily" },
    { id: "daily-3", label: "2025-01-13", size: 3, category: "daily" },
    { id: "project-1", label: "Website Overview", size: 10, category: "project" },
    { id: "project-2", label: "Design System", size: 6, category: "project" },
    { id: "research-1", label: "React Patterns", size: 7, category: "research" },
    { id: "research-2", label: "D3.js Tips", size: 9, category: "research" },
  ],
  links: [
    { source: "daily-1", target: "research-2" },
    { source: "daily-1", target: "project-1" },
    { source: "project-1", target: "project-2" },
    { source: "project-1", target: "research-1" },
    { source: "daily-2", target: "daily-1" },
    { source: "daily-2", target: "research-1" },
  ],
}

export function findFile(items: TreeNode[], id: string): string | null {
  for (const item of items) {
    if (item.type === "file" && item.id === id) {
      return item.name
    }
    if (item.children) {
      const found = findFile(item.children, id)
      if (found) return found
    }
  }
  return null
}

export function getFileMetadata(id: string) {
  const content = fileContents[id] || ""
  const words = content
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
  const links = content.match(/\[\[([^\]]+)\]\]/g) || []
  const backlinks = Object.entries(fileContents)
    .filter(([key, val]) => key !== id && val.includes(`[[${id}`))
    .map(([key]) => key)

  return {
    wordCount: words,
    charCount: content.length,
    links: links.map((l) => l.replace(/\[\[|\]\]/g, "").split("|")[0]),
    backlinks,
    created: "Jan 10, 2025",
    modified: "2 minutes ago",
    // Example of how to add custom fields dynamically
    tags: ["notes", "active"],
    category: "Daily",
    status: "Published",
  }
}
