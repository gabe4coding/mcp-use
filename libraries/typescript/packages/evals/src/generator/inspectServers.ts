import { MCPClient } from "mcp-use";
import { loadEvalConfig } from "../runtime/loadEvalConfig.js";

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ResourceSchema {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

export interface ServerSchema {
  name: string;
  tools: ToolSchema[];
  resources: ResourceSchema[];
}

export function mapTool(tool: {
  name: string;
  description?: string;
  inputSchema: unknown;
}): ToolSchema {
  return {
    name: tool.name,
    description: tool.description || "",
    inputSchema: tool.inputSchema as ToolSchema["inputSchema"],
  };
}

export function mapResource(resource: {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}): ResourceSchema {
  return {
    name: resource.name,
    uri: resource.uri,
    description: resource.description,
    mimeType: resource.mimeType,
  };
}

export async function inspectServers(options: {
  configPath?: string;
  servers?: string[];
} = {}): Promise<ServerSchema[]> {
  const config = await loadEvalConfig(options.configPath);
  const client = new MCPClient({ mcpServers: config.servers });
  
  try {
    await client.createAllSessions();
  } catch (error) {
    console.error("Warning: Some servers failed to initialize fully:", error);
    // Continue anyway - some servers might have connected
  }

  const serverNames = options.servers ?? Object.keys(config.servers);
  const schemas: ServerSchema[] = [];

  for (const serverName of serverNames) {
    try {
      const session = client.requireSession(serverName);
      const tools = session.tools.map(mapTool);
      
      // Try to list resources, but gracefully handle if not supported
      let resources: ResourceSchema[] = [];
      try {
        const resourcesResult = await session.listResources();
        resources = (resourcesResult.resources || []).map(mapResource);
      } catch (error) {
        // Server doesn't support resources capability, that's ok
        console.log(`Note: Server "${serverName}" doesn't support resources`);
      }

      schemas.push({ name: serverName, tools, resources });
    } catch (error) {
      console.warn(`Warning: Failed to inspect server "${serverName}":`, error);
      // Continue with other servers
    }
  }

  await client.closeAllSessions().catch(() => {
    // Ignore cleanup errors
  });
  
  return schemas;
}
