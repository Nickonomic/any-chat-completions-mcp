#!/usr/bin/env node

import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import OpenAI from 'openai';

dotenv.config();

const AI_CHAT_BASE_URL = process.env.AI_CHAT_BASE_URL;
const AI_CHAT_KEY = process.env.AI_CHAT_KEY;
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL;
const AI_CHAT_NAME = process.env.AI_CHAT_NAME;

if (!AI_CHAT_BASE_URL) {
  throw new Error("AI_CHAT_BASE_URL is required")
}

if (!AI_CHAT_KEY) {
  throw new Error("AI_CHAT_KEY is required")
}

if (!AI_CHAT_MODEL) {
  throw new Error("AI_CHAT_MODEL is required")
}

if (!AI_CHAT_NAME) {
  throw new Error("AI_CHAT_NAME is required")
}
const AI_CHAT_NAME_CLEAN = AI_CHAT_NAME.toLowerCase().replace(' ', '-')

const server = new Server(
  {
    name: "any-chat-completions-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing resources.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [],
  };
});

/**
 * Handler for reading the contents of a specific resource.
 */
server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error(`Resource not found`);

});

/**
 * Handler that lists available tools.
 * Exposes a single "chat" tool that lets clients chat with another AI.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolName = `ask-${AI_CHAT_NAME_CLEAN}`;
  return {
    tools: [
      {
        name: toolName,
        description: `Ask ${AI_CHAT_NAME} a question`,
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: `The question to ask ${AI_CHAT_NAME}`,
            }
          },
          required: ["content"]
        }
      }
    ]
  };
});

/**
 * Handler for the chat tool.
 * Connects to an OpenAI SDK compatible AI Integration.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    // Only handle our specific tool
    if (name === `ask-${AI_CHAT_NAME_CLEAN}`) {
      if (!args?.content) {
        throw new Error("Content is required");
      }

      const content = String(args.content);
      
      const client = new OpenAI({
        apiKey: AI_CHAT_KEY,
        baseURL: AI_CHAT_BASE_URL,
      });

      const chatCompletion = await client.chat.completions.create({
        messages: [{ role: 'user', content: content }],
        model: AI_CHAT_MODEL,
      });

      return {
        content: [
          {
            type: "text",
            text: chatCompletion.choices[0]?.message?.content || "No response"
          }
        ],
        isError: false
      };
    }

    // For any other tool, return error response
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

/**
 * Handler that lists available prompts.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: []
  };
});

/**
 * Handler for the get prompt.
 */
server.setRequestHandler(GetPromptRequestSchema, async () => {
  throw new Error("Unknown prompt");
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});


