# MCP Apps Server

An MCP server with widgets using the MCP Apps standard.

## Features

- **MCP Apps Standard**: Uses `text/html;profile=mcp-app` MIME type
- **@modelcontextprotocol/ext-apps**: Official client library for MCP Apps hosts
- **React Widgets**: Interactive UI components built with React
- **TypeScript Support**: Full type safety with Zod schema validation

## MCP Apps Standard

| Property | Value |
|----------|-------|
| MIME Type | `text/html;profile=mcp-app` |
| Communication | `@modelcontextprotocol/ext-apps` |
| Transport | PostMessage to parent window |

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server with hot reloading
npm run dev
```

This will start:
- MCP server on port 3000
- Widget serving at `/mcp-use/widgets/*`
- Inspector UI at `/inspector`

### Production

```bash
# Build the server and widgets
npm run build

# Run the built server
npm start
```

## How It Works

### The useWidget Hook

The `useWidget` hook from `mcp-use/react` provides the MCP Apps API:

```typescript
import { useWidget } from "mcp-use/react";

function MyWidget() {
  const {
    props,        // Widget props from tool invocation
    theme,        // 'light' | 'dark'
    callTool,     // Call MCP tools via host
    sendMessage,  // Send messages via host
    openLink,     // Open external links
  } = useWidget<MyWidgetProps>();

  return <div>MCP Apps Widget</div>;
}
```

### MCP Apps Communication

The widget uses `@modelcontextprotocol/ext-apps` for host communication:

| Method | MCP Apps API |
|--------|--------------|
| `callTool(name, args)` | `app.callServerTool({ name, arguments })` |
| `sendMessage(text)` | `app.sendMessage({ content, role })` |
| `openLink(href)` | `app.openLink({ url })` |

## Creating Widgets

### 1. Create the Widget Component

```typescript
// resources/my-widget/widget.tsx
import React from "react";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { propSchema, type MyWidgetProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "My MCP Apps widget",
  props: propSchema,
  hostType: "mcp-app",
};

function MyWidget() {
  const { props, callTool } = useWidget<MyWidgetProps>();

  return (
    <McpUseProvider autoSize>
      <div>
        <p>Props: {JSON.stringify(props)}</p>
        <button onClick={() => callTool("my-tool", {})}>
          Call Tool
        </button>
      </div>
    </McpUseProvider>
  );
}

export default MyWidget;
```

### 2. Define Props with Zod Schema

```typescript
// resources/my-widget/types.ts
import { z } from "zod";

export const propSchema = z.object({
  title: z.string().optional(),
  items: z.array(z.string()).optional(),
});

export type MyWidgetProps = z.infer<typeof propSchema>;
```

### 3. Automatic Registration

Widgets in the `resources/` folder are automatically:
- Registered as MCP tools
- Registered with `text/html;profile=mcp-app` MIME type

## Testing

### Via Inspector UI

1. Start the server: `npm run dev`
2. Open: `http://localhost:3000/inspector`
3. Test tools and resources

### Direct Browser Access

Visit: `http://localhost:3000/mcp-use/widgets/task-manager`

### Via MCP Client

```typescript
// Call as tool
const result = await client.callTool('task-manager', {
  initialTasks: [{ id: '1', title: 'Test', completed: false, priority: 'high' }],
});

// Access as resource
const resource = await client.readResource('ui://widget/task-manager-mcp.html');
```

## Dependencies

- `mcp-use`: Core MCP framework
- `@modelcontextprotocol/ext-apps`: MCP Apps standard client library
- `react`: UI framework
- `zod`: Schema validation

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP Apps Standard](https://github.com/modelcontextprotocol/specification)
- [mcp-use Documentation](https://github.com/mcp-use/mcp-use)
