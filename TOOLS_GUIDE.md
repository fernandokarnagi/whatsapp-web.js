# Agent Tools Guide

This guide explains the Agentic AI tool pattern used in the multi-agent chatbot system.

## Overview

The system follows a **tool-based architecture** where:
- **Agents** are conversational AI that can use tools
- **Tools** are capabilities that extend what agents can do (search Notion, check weather, etc.)
- **OpenAI Function Calling** enables agents to intelligently decide when to use tools

## Architecture

```
┌──────────────────────────────────────────┐
│          AgentManager                     │
│  (Initializes tools on startup)           │
└──────────────────┬───────────────────────┘
                   │
      ┌────────────┴──────────────┐
      │                           │
      ▼                           ▼
┌─────────────┐          ┌─────────────┐
│ DynamicAgent│          │ DynamicAgent│
│  (tools: ✓) │          │  (tools: ✗) │
└──────┬──────┘          └─────────────┘
       │
       ├─── OpenAI Function Calling ───┐
       │                                │
       ▼                                ▼
┌─────────────┐                  ┌─────────────┐
│ NotionTool  │                  │ WeatherTool │
│             │                  │  (example)  │
└─────────────┘                  └─────────────┘
```

## Key Concepts

### 1. Tools are NOT Agents

**Before (NotionAgent - removed):**
```javascript
// ✗ Notion was a separate agent
class NotionAgent extends BaseAgent {
    async handleMessage() {
        // Notion-specific logic
    }
}
```

**After (NotionTool - current):**
```javascript
// ✓ Notion is a tool that any agent can use
class NotionTool extends BaseTool {
    async execute(args) {
        // Query Notion workspace
        return results;
    }
}
```

### 2. Agents Use Tools via OpenAI Function Calling

When an agent has tools enabled:

1. User sends message: *"What's our API documentation?"*
2. Agent calls OpenAI with the message + available tools
3. OpenAI decides to call `query_notion` tool
4. Tool executes and returns results
5. OpenAI formats the results into a user-friendly response
6. User receives: *"I found your API documentation..."*

### 3. Dynamic Configuration

Agents can be configured at runtime with different tools:

```javascript
// Agent with Notion only
await agentManager.createAgent({
    agentId: 'docs-agent',
    toolsEnabled: true,
    enabledTools: ['query_notion']
});

// Agent with multiple tools
await agentManager.createAgent({
    agentId: 'super-agent',
    toolsEnabled: true,
    enabledTools: ['query_notion', 'weather_tool', 'calculator_tool']
});

// Agent with no tools
await agentManager.createAgent({
    agentId: 'simple-agent',
    toolsEnabled: false,
    enabledTools: []
});
```

## Available Tools

### query_notion

Search and retrieve content from Notion workspace.

**Actions:**
- `search`: Search for pages by query
- `get_page`: Retrieve specific page content
- `query_database`: Query a Notion database

**Example Tool Call (internal):**
```json
{
  "action": "search",
  "query": "API documentation",
  "limit": 5
}
```

See [NOTION_INTEGRATION.md](./NOTION_INTEGRATION.md) for full documentation.

## Creating Custom Tools

### Step 1: Create Tool Class

```javascript
// tools/WeatherTool.js
const BaseTool = require('./BaseTool');

class WeatherTool extends BaseTool {
    constructor() {
        super({
            name: 'get_weather',
            description: 'Get current weather for a location',
            parameters: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'City name or coordinates'
                    },
                    units: {
                        type: 'string',
                        enum: ['celsius', 'fahrenheit'],
                        description: 'Temperature units'
                    }
                },
                required: ['location']
            }
        });
    }

    async execute(args) {
        const { location, units = 'celsius' } = args;

        // Call weather API
        const weatherData = await this.fetchWeather(location);

        return {
            location: weatherData.location,
            temperature: weatherData.temp,
            conditions: weatherData.conditions,
            units
        };
    }

    async fetchWeather(location) {
        // Implement weather API call
        // ...
    }
}

module.exports = WeatherTool;
```

### Step 2: Register Tool

Add to `tools/index.js`:

```javascript
const toolRegistry = require('./ToolRegistry');
const NotionTool = require('./NotionTool');
const WeatherTool = require('./WeatherTool');

function initializeTools() {
    console.log('Initializing tools...');

    const notionTool = new NotionTool();
    toolRegistry.registerTool(notionTool);

    const weatherTool = new WeatherTool();
    toolRegistry.registerTool(weatherTool);

    console.log(`Initialized ${toolRegistry.getAllTools().length} tool(s)`);
}
```

### Step 3: Use in Agent

Using the management tool:

```bash
node manage-agents.js create-agent
```

When prompted, enable tools and add `get_weather` to the enabled tools list.

Or programmatically:

```javascript
await agentManager.createAgent({
    agentId: 'weather-agent',
    name: 'Weather Assistant',
    systemPrompt: 'You help users check weather. Use the get_weather tool when asked.',
    toolsEnabled: true,
    enabledTools: ['get_weather']
});
```

## Best Practices

### 1. Clear System Prompts

Guide agents on when to use tools:

```javascript
systemPrompt: `You are a knowledge assistant.

When users ask about:
- Company documentation → Use query_notion
- Weather → Use get_weather
- Calculations → Use calculator_tool

Always explain what you're searching for before using a tool.`
```

### 2. Tool Naming

- Use verb_noun format: `get_weather`, `query_notion`, `calculate_sum`
- Be descriptive and specific
- Avoid generic names like `search` or `get_data`

### 3. Error Handling

Tools should return structured errors:

```javascript
async execute(args) {
    try {
        const result = await this.doSomething(args);
        return result;
    } catch (error) {
        return {
            error: true,
            message: error.message,
            code: 'TOOL_ERROR'
        };
    }
}
```

### 4. Parameter Validation

Define clear parameter schemas:

```javascript
parameters: {
    type: 'object',
    properties: {
        query: {
            type: 'string',
            description: 'Search query (required)',
            minLength: 1
        },
        limit: {
            type: 'number',
            description: 'Max results (1-100)',
            minimum: 1,
            maximum: 100
        }
    },
    required: ['query']
}
```

### 5. Response Size

Keep tool responses concise:

```javascript
// ✓ Good - truncate large content
const preview = content.substring(0, 1000);
return { preview, full_length: content.length };

// ✗ Bad - return huge responses
return { content: veryLargeString };
```

## Debugging Tools

### Check Tool Registration

```javascript
const { toolRegistry } = require('./tools');

console.log('Registered tools:', toolRegistry.getAllTools().map(t => t.name));
// Output: ['query_notion', 'get_weather']
```

### Test Tool Directly

```javascript
const { toolRegistry } = require('./tools');

const result = await toolRegistry.executeTool('query_notion', {
    action: 'search',
    query: 'test',
    limit: 3
});

console.log(result);
```

### Monitor Tool Calls

Check console logs when agent uses tools:

```
Executing tool: query_notion with args: { action: 'search', query: 'API docs', limit: 5 }
```

## Common Issues

### Tool Not Called

**Problem:** Agent doesn't use the tool when expected

**Solutions:**
1. Check `toolsEnabled: true` in agent config
2. Verify tool name in `enabledTools` array
3. Update system prompt to mention the tool
4. Make tool description clearer

### Tool Returns Error

**Problem:** Tool execution fails

**Solutions:**
1. Check tool parameters match schema
2. Verify external service (e.g., Notion API key)
3. Add error handling in `execute()` method
4. Test tool directly with sample inputs

### Multiple Tool Calls

**Problem:** Agent calls same tool repeatedly

**Solutions:**
1. Update system prompt to be more directive
2. Reduce temperature for more deterministic behavior
3. Improve tool descriptions to be more specific

## Examples

### Simple Agent (No Tools)

```bash
node manage-agents.js create-agent
# When prompted for "Enable tools?", answer: no
```

### Single Tool Agent (Quick Start)

```bash
# Pre-configured Notion agent
node manage-agents.js create-knowledge-agent
```

Or create custom:

```bash
node manage-agents.js create-agent
# Enable tools: yes
# Enabled tools: query_notion
```

### Multi-Tool Agent

```bash
node manage-agents.js create-agent
# Enable tools: yes
# Enabled tools: query_notion, get_weather, calculator_tool
```

Or programmatically:

```javascript
await agentManager.createAgent({
    agentId: 'super-agent',
    name: 'Super Assistant',
    systemPrompt: `You are a versatile assistant with multiple capabilities:
- Search documentation with query_notion
- Check weather with get_weather
- Perform calculations with calculator_tool`,
    toolsEnabled: true,
    enabledTools: ['query_notion', 'get_weather', 'calculator_tool']
});
```

## Related Documentation

- [NOTION_INTEGRATION.md](./NOTION_INTEGRATION.md) - Notion tool detailed guide
- [MULTI_AGENT_CHATBOT.md](./MULTI_AGENT_CHATBOT.md) - Agent system overview
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) - Official docs
