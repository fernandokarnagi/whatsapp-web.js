# Notion Tool Integration for Multi-Agent Chatbot

This guide explains how to integrate Notion with your WhatsApp chatbot system using the Agentic AI tool pattern. Notion is available as a **tool** that can be used by any dynamic agent via OpenAI function calling.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup](#setup)
3. [Configuration](#configuration)
4. [Using Notion Tool with Dynamic Agents](#using-notion-tool-with-dynamic-agents)
5. [Notion Tool API](#notion-tool-api)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Tool-Based Pattern

The Notion integration follows the **Agentic AI tool pattern**:

1. **Notion is a Tool** (not an agent) - Located in `tools/NotionTool.js`
2. **Tools are registered** in the ToolRegistry on startup
3. **Agents can use tools** via OpenAI function calling
4. **Dynamic agents** can be configured to enable/disable specific tools

```
┌─────────────────┐
│  Dynamic Agent  │
│  (with tools)   │
└────────┬────────┘
         │
         ├─── Uses OpenAI Function Calling
         │
         ▼
┌─────────────────┐
│  Notion Tool    │ ──── Queries ───▶ Notion Workspace
└─────────────────┘
```

---

## Setup

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "WhatsApp Bot")
4. Select the workspace you want to integrate with
5. Click "Submit"
6. Copy the "Internal Integration Token" (starts with `secret_`)

### 2. Share Pages with Your Integration

For the integration to access pages, you must explicitly share them:

1. Open the Notion page you want the bot to access
2. Click "Share" in the top right
3. Click "Invite"
4. Find your integration name and select it
5. Click "Invite"

You can share individual pages or entire databases. Child pages inherit access automatically.

### 3. Configure Environment Variables

Add your Notion integration token to your `.env` file:

```env
NOTION_API_KEY=secret_your-notion-integration-token-here
```

---

## Configuration

### Creating an Agent with Notion Tool

#### Option 1: Quick Start (Recommended)

Use the pre-configured knowledge agent command:

```bash
node manage-agents.js create-knowledge-agent
```

This creates a ready-to-use agent with Notion tool enabled and optimized settings.

#### Option 2: Custom Configuration

Create a custom agent with the interactive tool:

```bash
node manage-agents.js create-agent
```

When prompted:
- **Agent ID**: `knowledge-agent`
- **Name**: `Knowledge Assistant`
- **Description**: `Helps users find information from Notion workspace`
- **System Prompt**: (see example below)
- **Model**: `gpt-4o-mini`
- **Temperature**: `0.5`
- **Max Tokens**: `1500`
- **Enable tools**: `yes`
- **Enabled tools**: `query_notion`

Example System Prompt:
```
You are a helpful knowledge assistant with access to a Notion workspace.

When users ask questions:
1. Use the query_notion tool to search for relevant information
2. Summarize the findings in a clear, helpful way
3. Include relevant URLs so users can access the full content

Always cite your sources and be transparent when information is not found.
```

### Programmatic Agent Creation

```javascript
const agentManager = require('./agents/AgentManager');

await agentManager.initialize();

await agentManager.createAgent({
    agentId: 'knowledge-agent',
    name: 'Knowledge Assistant',
    description: 'Searches and retrieves content from Notion workspace',
    systemPrompt: `You are a helpful knowledge assistant with access to a Notion workspace...`,
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 1500,
    toolsEnabled: true,
    enabledTools: ['query_notion']
});
```

---

## Using Notion Tool with Dynamic Agents

Once configured, agents with the `query_notion` tool enabled can:

### Search for Information

```
User: Find documentation about our API endpoints
Agent: [Uses query_notion tool to search]
      I found 2 relevant pages in your Notion workspace:

      1. API Documentation
         Contains detailed information about all REST endpoints...
         https://notion.so/...

      2. API Best Practices
         Guidelines for using our API...
         https://notion.so/...
```

### Retrieve Specific Pages

```
User: Get the content from https://notion.so/Meeting-Notes-xyz789
Agent: [Uses query_notion tool to retrieve page]
      Here are the meeting notes from January 5th:

      Attendees:
      - John Doe
      - Jane Smith

      Discussion points:
      ...
```

---

## Notion Tool API

The `query_notion` tool provides three actions:

### 1. Search Pages

Search for pages in the Notion workspace.

**Function Call:**
```json
{
  "action": "search",
  "query": "API documentation",
  "limit": 5
}
```

**Returns:**
```json
{
  "found": 2,
  "pages": [
    {
      "id": "page-id-123",
      "title": "API Documentation",
      "url": "https://notion.so/...",
      "preview": "This document contains..."
    }
  ]
}
```

### 2. Get Page Content

Retrieve full content of a specific page.

**Function Call:**
```json
{
  "action": "get_page",
  "query": "page-id-123"
}
```

**Returns:**
```json
{
  "content": "# Page Title\n\nPage content in markdown...",
  "truncated": false,
  "full_length": 1250
}
```

### 3. Query Database

Query a specific Notion database.

**Function Call:**
```json
{
  "action": "query_database",
  "database_id": "database-id-456",
  "limit": 10
}
```

**Returns:**
```json
{
  "found": 5,
  "items": [
    {
      "id": "item-id-789",
      "title": "Task 1",
      "url": "https://notion.so/..."
    }
  ]
}
```

---

## Examples

### Example 1: Knowledge Base Search

```
User: What are our deployment procedures?
Agent: Let me search our documentation...

[Agent calls query_notion tool]
{
  "action": "search",
  "query": "deployment procedures"
}

[Tool returns results]

Agent: I found our deployment documentation:

1. Deployment Procedures v2.0
   This document outlines the step-by-step process for deploying to production:
   - Pre-deployment checklist
   - Deployment steps
   - Post-deployment verification

   Full guide: https://notion.so/...

2. CI/CD Pipeline Guide
   Automated deployment using GitHub Actions...
   https://notion.so/...

Would you like me to retrieve the full content of either document?
```

### Example 2: Direct Page Retrieval

```
User: Show me the contents of https://notion.so/Q1-Roadmap-abc123
Agent: [Calls query_notion tool to retrieve page]

Here's the Q1 Roadmap:

# Q1 2024 Roadmap

## Goals
- Launch new API v2
- Improve performance by 50%
- Add mobile app support

## Timeline
...
```

---

## Troubleshooting

### Error: "NOTION_API_KEY not found"

**Solution:** Make sure you've added `NOTION_API_KEY` to your `.env` file and restarted the bot.

### Tool Not Available to Agent

**Causes:**
1. Agent's `toolsEnabled` is set to `false`
2. `query_notion` is not in the agent's `enabledTools` array
3. Tools were not initialized on startup

**Solution:**
- Check agent profile in database
- Update agent configuration:
```javascript
await agent.updateProfile({
    toolsEnabled: true,
    enabledTools: ['query_notion']
});
```

### Error: "Could not find page" or "Object not found"

**Causes:**
1. The page hasn't been shared with your integration
2. The page ID is incorrect
3. The page was deleted

**Solution:**
- Open the page in Notion
- Click "Share" and invite your integration
- Verify the page exists and the ID is correct

### No Search Results

**Causes:**
1. Pages haven't been shared with the integration
2. Search query doesn't match any page titles or content

**Solution:**
- Share more pages with your integration
- Try broader search terms

---

## Best Practices

1. **Clear System Prompts**: Instruct agents on when and how to use the Notion tool
2. **Limit Results**: Use reasonable limits (5-10) to avoid overwhelming responses
3. **Cache Results**: The tool handles this internally for frequently accessed pages
4. **Share Selectively**: Only share pages with your integration that the bot needs to access
5. **Secure Your Token**: Never commit your `NOTION_API_KEY` to version control
6. **Monitor Usage**: Track tool calls to understand how agents are using Notion

---

## Advanced Topics

### Creating Custom Tools

You can create additional tools following the same pattern:

```javascript
const BaseTool = require('./tools/BaseTool');

class CustomTool extends BaseTool {
    constructor() {
        super({
            name: 'my_custom_tool',
            description: 'Description of what this tool does',
            parameters: {
                type: 'object',
                properties: {
                    // Define parameters
                },
                required: []
            }
        });
    }

    async execute(args) {
        // Implement tool logic
        return result;
    }
}

module.exports = CustomTool;
```

Register it in `tools/index.js`:

```javascript
const customTool = new CustomTool();
toolRegistry.registerTool(customTool);
```

### Multi-Tool Agents

Agents can use multiple tools:

```javascript
await agentManager.createAgent({
    agentId: 'super-agent',
    name: 'Super Assistant',
    systemPrompt: '...',
    toolsEnabled: true,
    enabledTools: ['query_notion', 'weather_tool', 'calculator_tool']
});
```

---

## Related Documentation

- [Notion API Documentation](https://developers.notion.com/)
- [Multi-Agent Chatbot Documentation](./MULTI_AGENT_CHATBOT.md)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
