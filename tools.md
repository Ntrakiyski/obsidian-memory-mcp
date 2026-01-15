# MCP Tools Documentation

This document provides detailed documentation for all MCP (Model Context Protocol) tools available in the Obsidian Memory knowledge graph server.

## Overview

The server provides 9 tools for managing a knowledge graph backed by markdown files. All entities are stored as individual markdown files with YAML frontmatter, and relations use Obsidian link syntax.

---

## Tools

### 1. create_entities

**Description:** Creates multiple new entities in the knowledge graph.

**Input Schema:**
```json
{
  "entities": [
    {
      "name": "string (required)",
      "entityType": "string (required)",
      "observations": ["string (required)"]
    }
  ]
}
```

**Parameters:**
- `entities` (array, required): Array of entity objects to create
  - `name` (string, required): The name of the entity
  - `entityType` (string, required): The type/category of the entity (e.g., "person", "project", "concept")
  - `observations` (array of strings, required): Initial observations about the entity

**Output Example:**
```json
[
  {
    "name": "Alice",
    "entityType": "person",
    "observations": [
      "Works as a software engineer",
      "Interested in AI and machine learning"
    ]
  },
  {
    "name": "Project X",
    "entityType": "project",
    "observations": [
      "Started in January 2024",
      "Focus on knowledge management"
    ]
  }
]
```

**Behavior:**
- Skips entities that already exist (doesn't overwrite)
- Creates a markdown file for each new entity
- Returns only successfully created entities

**Example Usage:**
```json
{
  "entities": [
    {
      "name": "Alice",
      "entityType": "person",
      "observations": [
        "Works as a software engineer",
        "Interested in AI and machine learning"
      ]
    }
  ]
}
```

---

### 2. create_relations

**Description:** Creates multiple new relations between entities in the knowledge graph.

**Input Schema:**
```json
{
  "relations": [
    {
      "from": "string (required)",
      "to": "string (required)",
      "relationType": "string (required)"
    }
  ]
}
```

**Parameters:**
- `relations` (array, required): Array of relation objects to create
  - `from` (string, required): Source entity name
  - `to` (string, required): Target entity name
  - `relationType` (string, required): Type of relation (e.g., "worksOn", "knows", "dependsOn")

**Output Example:**
```json
[
  {
    "from": "Alice",
    "to": "Project X",
    "relationType": "worksOn"
  },
  {
    "from": "Alice",
    "to": "Bob",
    "relationType": "knows"
  }
]
```

**Behavior:**
- Skips duplicate relations (if the same relation already exists)
- Updates the source entity's markdown file with Obsidian link format: `[[relationType::targetEntity]]`
- Returns only newly created relations

**Example Usage:**
```json
{
  "relations": [
    {
      "from": "Alice",
      "to": "Project X",
      "relationType": "worksOn"
    }
  ]
}
```

---

### 3. add_observations

**Description:** Adds new observations to existing entities.

**Input Schema:**
```json
{
  "observations": [
    {
      "entityName": "string (required)",
      "contents": ["string (required)"]
    }
  ]
}
```

**Parameters:**
- `observations` (array, required): Array of observation objects
  - `entityName` (string, required): Name of the entity to update
  - `contents` (array of strings, required): New observations to add

**Output Example:**
```json
[
  {
    "entityName": "Alice",
    "addedObservations": [
      "Completed certification in machine learning",
      "Leading the backend team"
    ]
  }
]
```

**Behavior:**
- Filters out duplicate observations (won't add if already exists)
- Appends new observations to the entity's markdown file
- Returns only the observations that were actually added (excludes duplicates)

**Example Usage:**
```json
{
  "observations": [
    {
      "entityName": "Alice",
      "contents": [
        "Completed certification in machine learning",
        "Leading the backend team"
      ]
    }
  ]
}
```

---

### 4. delete_entities

**Description:** Deletes multiple entities and their associated relations from the knowledge graph.

**Input Schema:**
```json
{
  "entityNames": ["string (required)"]
}
```

**Parameters:**
- `entityNames` (array of strings, required): Names of entities to delete

**Output Example:**
```
Entities deleted successfully
```

**Behavior:**
- Deletes the markdown files for specified entities
- Removes all relations pointing to the deleted entities from other entity files
- Cleans up dangling references throughout the graph

**Example Usage:**
```json
{
  "entityNames": ["Alice", "Project X"]
}
```

---

### 5. delete_observations

**Description:** Deletes specific observations from entities.

**Input Schema:**
```json
{
  "deletions": [
    {
      "entityName": "string (required)",
      "observations": ["string (required)"]
    }
  ]
}
```

**Parameters:**
- `deletions` (array, required): Array of deletion objects
  - `entityName` (string, required): Name of the entity containing the observations
  - `observations` (array of strings, required): Exact observation strings to remove

**Output Example:**
```
Observations deleted successfully
```

**Behavior:**
- Removes specified observation strings from entity files
- Observations must match exactly to be deleted
- Updates the entity's markdown file

**Example Usage:**
```json
{
  "deletions": [
    {
      "entityName": "Alice",
      "observations": [
        "Works as a software engineer"
      ]
    }
  ]
}
```

---

### 6. delete_relations

**Description:** Deletes multiple relations from the knowledge graph.

**Input Schema:**
```json
{
  "relations": [
    {
      "from": "string (required)",
      "to": "string (required)",
      "relationType": "string (required)"
    }
  ]
}
```

**Parameters:**
- `relations` (array, required): Array of relation objects to delete
  - `from` (string, required): Source entity name
  - `to` (string, required): Target entity name
  - `relationType` (string, required): Type of relation to delete

**Output Example:**
```
Relations deleted successfully
```

**Behavior:**
- Removes specific relation links from source entity markdown files
- Must match all three parameters (from, to, relationType) exactly

**Example Usage:**
```json
{
  "relations": [
    {
      "from": "Alice",
      "to": "Project X",
      "relationType": "worksOn"
    }
  ]
}
```

---

### 7. read_graph

**Description:** Reads and returns the entire knowledge graph.

**Input Schema:**
```json
{}
```

**Parameters:**
- None required

**Output Example:**
```json
{
  "entities": [
    {
      "name": "Alice",
      "entityType": "person",
      "observations": [
        "Works as a software engineer",
        "Interested in AI and machine learning"
      ]
    },
    {
      "name": "Project X",
      "entityType": "project",
      "observations": [
        "Started in January 2024",
        "Focus on knowledge management"
      ]
    }
  ],
  "relations": [
    {
      "from": "Alice",
      "to": "Project X",
      "relationType": "worksOn"
    }
  ]
}
```

**Behavior:**
- Loads all markdown files from the memory directory
- Parses each file to extract entities, observations, and relations
- Returns the complete graph structure

**Example Usage:**
```json
{}
```

---

### 8. search_nodes

**Description:** Searches for nodes in the knowledge graph based on a query string.

**Input Schema:**
```json
{
  "query": "string (required)"
}
```

**Parameters:**
- `query` (string, required): Search query to match against entity names, types, and observation content

**Output Example:**
```json
{
  "entities": [
    {
      "name": "Alice",
      "entityType": "person",
      "observations": [
        "Works as a software engineer",
        "Interested in AI and machine learning"
      ]
    }
  ],
  "relations": [
    {
      "from": "Alice",
      "to": "Project X",
      "relationType": "worksOn"
    }
  ]
}
```

**Behavior:**
- Performs case-insensitive search across entity names, types, and observations
- Returns only entities that match the query
- Filters relations to include only those between matched entities

**Example Usage:**
```json
{
  "query": "software engineer"
}
```

---

### 9. open_nodes

**Description:** Opens (retrieves) specific nodes in the knowledge graph by their names.

**Input Schema:**
```json
{
  "names": ["string (required)"]
}
```

**Parameters:**
- `names` (array of strings, required): Array of entity names to retrieve

**Output Example:**
```json
{
  "entities": [
    {
      "name": "Alice",
      "entityType": "person",
      "observations": [
        "Works as a software engineer",
        "Interested in AI and machine learning"
      ]
    },
    {
      "name": "Bob",
      "entityType": "person",
      "observations": [
        "Works as a designer"
      ]
    }
  ],
  "relations": [
    {
      "from": "Alice",
      "to": "Bob",
      "relationType": "knows"
    }
  ]
}
```

**Behavior:**
- Retrieves specific entities by exact name matching
- Returns only relations between the retrieved entities
- Useful for focused access to specific graph nodes

**Example Usage:**
```json
{
  "names": ["Alice", "Bob"]
}
```

---

## Storage Format

Entities are stored as markdown files in the memory directory with the following structure:

```markdown
---
entityType: person
created: 2024-01-15T10:30:00.000Z
updated: 2024-01-15T10:30:00.000Z
---

# Alice

## Observations
- Works as a software engineer
- Interested in AI and machine learning

## Relations
- [[worksOn::Project X]]
- [[knows::Bob]]
```

**Key Features:**
- YAML frontmatter stores metadata (entityType, timestamps)
- Observations are stored as markdown list items
- Relations use Obsidian link syntax: `[[relationType::targetEntity]]`
- Compatible with Obsidian for visualization and manual editing

---

## Error Handling

All tools include error handling for common scenarios:
- **Missing entities**: Operations on non-existent entities will fail gracefully
- **Duplicate prevention**: create_entities and create_relations skip duplicates
- **File system errors**: Proper error messages for permission or I/O issues
- **Invalid input**: Schema validation ensures correct parameter types

---

## Integration

These tools can be accessed via:
1. **MCP Protocol**: Standard stdio-based communication
2. **HTTP API**: POST requests to tool endpoints (e.g., `/create_entities`)

Both interfaces provide identical functionality and use the same underlying storage manager.
