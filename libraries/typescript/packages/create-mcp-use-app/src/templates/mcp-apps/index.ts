import { MCPServer } from "mcp-use/server";

// Create an MCP server with dual host support (OpenAI Apps SDK + MCP Apps)
const server = new MCPServer({
  name: "mcp-apps-server",
  version: "1.0.0",
  description: "MCP server with dual host support for OpenAI Apps SDK and MCP Apps",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/**
 * ════════════════════════════════════════════════════════════════════
 * Task Manager Widget (Apps SDK / MCP Apps compatible)
 * ════════════════════════════════════════════════════════════════════
 *
 * This widget demonstrates dual host support:
 * - Works with OpenAI ChatGPT via Apps SDK (text/html+skybridge)
 * - Works with MCP Apps compliant hosts (text/html;profile=mcp-app)
 * - Works standalone in Inspector/development mode
 *
 * The widget is defined in resources/task-manager/widget.tsx and uses
 * the useWidget hook which automatically adapts to the host environment.
 *
 * Resources registered:
 * - ui://widget/task-manager.html (Apps SDK)
 * - ui://widget/task-manager-mcp.html (MCP Apps)
 */

/**
 * ════════════════════════════════════════════════════════════════════
 * Traditional MCP Tools
 * ════════════════════════════════════════════════════════════════════
 *
 * You can mix widgets with traditional MCP tools
 */

server.tool(
  {
    name: "get-widget-info",
    description: "Get information about available UI widgets and their host compatibility",
  },
  async () => {
    const widgets = [
      {
        name: "task-manager",
        type: "appsSdk",
        hosts: ["apps-sdk", "mcp-app", "standalone"],
        resources: {
          appsSdk: "ui://widget/task-manager.html",
          mcpApp: "ui://widget/task-manager-mcp.html",
        },
        tool: "task-manager",
      },
    ];

    return {
      content: [
        {
          type: "text",
          text:
            `Available UI Widgets:\n\n${widgets
              .map(
                (w) =>
                  `📦 ${w.name}\n` +
                  `  Type: ${w.type}\n` +
                  `  Tool: ${w.tool}\n` +
                  `  Supported Hosts: ${w.hosts.join(", ")}\n` +
                  `  Resources:\n` +
                  `    - Apps SDK: ${w.resources.appsSdk}\n` +
                  `    - MCP Apps: ${w.resources.mcpApp}\n`
              )
              .join("\n")}\n` +
            `\nHost Types Explained:\n` +
            `• apps-sdk: OpenAI ChatGPT native widgets\n` +
            `• mcp-app: MCP Apps standard compliant hosts\n` +
            `• standalone: Inspector, development, testing`,
        },
      ],
    };
  }
);

server.resource({
  name: "server-config",
  uri: "config://server",
  title: "Server Configuration",
  description: "Current server configuration and status",
  mimeType: "application/json",
  readCallback: async () => ({
    contents: [
      {
        uri: "config://server",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            port: PORT,
            version: "1.0.0",
            hostSupport: {
              appsSdk: {
                mimeType: "text/html+skybridge",
                description: "OpenAI ChatGPT Apps SDK",
              },
              mcpApp: {
                mimeType: "text/html;profile=mcp-app",
                description: "MCP Apps standard",
              },
              standalone: {
                description: "Inspector / development mode",
              },
            },
            widgets: {
              total: 1,
              list: ["task-manager"],
            },
            endpoints: {
              mcp: `http://localhost:${PORT}/mcp`,
              inspector: `http://localhost:${PORT}/inspector`,
              widgets: `http://localhost:${PORT}/mcp-use/widgets/`,
            },
          },
          null,
          2
        ),
      },
    ],
  }),
});

// Start the server
server.listen(PORT);

// Display helpful startup message
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         🎨 MCP Apps Server (Dual Host Support)                ║
╚═══════════════════════════════════════════════════════════════╝

Server is running on port ${PORT}

📍 Endpoints:
   MCP Protocol:  http://localhost:${PORT}/mcp
   Inspector UI:  http://localhost:${PORT}/inspector
   Widgets Base:  http://localhost:${PORT}/mcp-use/widgets/

🎯 Available Widgets:

   📦 task-manager
      Tool:      task-manager
      Resources:
        - Apps SDK: ui://widget/task-manager.html
        - MCP Apps: ui://widget/task-manager-mcp.html
      Browser:   http://localhost:${PORT}/mcp-use/widgets/task-manager

🌐 Supported Host Types:

   1️⃣  OpenAI Apps SDK (apps-sdk)
      • Runs natively in ChatGPT
      • Uses window.openai API
      • MIME: text/html+skybridge

   2️⃣  MCP Apps Standard (mcp-app)
      • Runs in MCP Apps compliant hosts
      • Uses @modelcontextprotocol/ext-apps
      • MIME: text/html;profile=mcp-app

   3️⃣  Standalone (standalone)
      • Inspector and development mode
      • Direct HTTP to MCP server
      • URL query parameters for props

📝 Widget automatically detects and adapts to the host environment!

💡 Tip: Open the Inspector UI to test widgets interactively!
`);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down server...");
  process.exit(0);
});

export default server;
