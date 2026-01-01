# Multi-Agent Chatbot System

This WhatsApp chatbot implements a multi-agent architecture where different AI agents can handle conversations from different message senders. Each agent maintains its own profile and conversation history in MongoDB Atlas.

## Architecture Overview

### Components

1. **AgentManager** (`agents/AgentManager.js`)
   - Routes incoming messages to the appropriate agent
   - Manages multiple agent instances
   - Handles agent initialization and shutdown
   - Initializes tools on startup

2. **BaseAgent** (`agents/BaseAgent.js`)
   - Base class that all agents extend
   - Integrates with OpenAI API
   - Manages conversation history
   - Handles agent profiles
   - Supports OpenAI function calling for tools

3. **DynamicAgent** (`agents/DynamicAgent.js`)
   - Dynamically created agents with custom configurations
   - Can be configured with tools via OpenAI function calling
   - Supports enabling/disabling specific tools

4. **Tool System**
   - **BaseTool** (`tools/BaseTool.js`) - Base class for all tools
   - **ToolRegistry** (`tools/ToolRegistry.js`) - Manages tool registration and execution
   - **NotionTool** (`tools/NotionTool.js`) - Tool for querying Notion workspace
   - Tools are registered on startup and available to agents via OpenAI function calling

5. **Database Models**
   - **AgentProfile** (`models/AgentProfile.js`) - Stores agent configurations
   - **ConversationHistory** (`models/ConversationHistory.js`) - Stores message history

6. **Database Connection** (`utils/database.js`)
   - Singleton MongoDB connection manager

## Setup

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- OpenAI API key

### Installation

1. Install dependencies (already done):
   ```bash
   npm install mongodb openai
   ```

2. Configure environment variables in `.env`:
   ```env
   # MongoDB Atlas Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=whatsapp_chatbot

   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

3. Start the bot:
   ```bash
   npm start
   ```

## Database Structure

### Collections

#### agent_profiles
```javascript
{
  agentId: "friendly-agent",
  name: "Friendly Assistant",
  description: "A warm and friendly conversational agent",
  systemPrompt: "You are a friendly assistant...",
  assignedSenders: ["John Doe", "Jane Smith"], // Array of sender names
  model: "gpt-4o-mini",
  temperature: 0.8,
  maxTokens: 500,
  toolsEnabled: false, // Whether tools are enabled for this agent
  enabledTools: [], // Array of tool names (e.g., ["query_notion"])
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

#### conversation_history
```javascript
{
  agentId: "friendly-agent",
  senderName: "John Doe",
  role: "user", // or "assistant"
  content: "Hello, how are you?",
  timestamp: ISODate(),
  messageId: "message_id_from_whatsapp",
  metadata: {}
}
```

## Usage

### How Messages are Routed

1. When a message arrives, the system first checks if the message is directed to the bot (`isMessageToMe`)
2. If the message is not directed to the bot, it is ignored (no response)
3. If the message is directed to the bot, the `AgentManager` checks if any agent is assigned to that sender
4. If an assigned agent is found, it handles the message
5. If no agent is assigned, the `DefaultAgent` handles it
6. The agent retrieves the last 10 messages from conversation history
7. The agent sends the context to OpenAI and gets a response
8. Both the user message and AI response are saved to the database

**Note:** The `isMessageToMe` flag is determined in `start.js` by checking if the message destination matches your WhatsApp number. You can customize this logic to fit your needs (e.g., respond to specific groups, keywords, or all messages).

### Assigning Senders to Agents

You can programmatically assign senders to agents:

```javascript
// In start.js or a separate management script
const agentManager = require('./agents/AgentManager');

// Initialize first
await agentManager.initialize();

// Assign a sender to an agent (using sender name)
await agentManager.assignSenderToAgent('John Doe', 'friendly-agent');

// Unassign a sender
await agentManager.unassignSender('John Doe', 'friendly-agent');

// Clear conversation history
await agentManager.clearHistory('John Doe', 'friendly-agent');
```

### Creating Custom Agents

You can create custom agents in two ways:

#### Option 1: Interactive CLI (Recommended)

Use the management tool to create agents interactively without writing code:

```bash
node manage-agents.js create-agent
```

This will prompt you for:
- **Agent ID**: Unique identifier (e.g., `sales-agent`)
- **Agent Name**: Display name (e.g., `Sales Assistant`)
- **Description**: Brief description of the agent's purpose
- **System Prompt**: Instructions for the agent (multi-line)
- **Model**: OpenAI model to use (default: `gpt-4o-mini`)
- **Temperature**: Creativity level 0.0-1.0 (default: `0.7`)
- **Max Tokens**: Maximum response length (default: `800`)

**Example:**
```bash
$ node manage-agents.js create-agent

=== Create New Agent ===

Agent ID (e.g., sales-agent): sales-agent
Agent Name (e.g., Sales Assistant): Sales Assistant
Description: Helps customers with product inquiries and sales

System Prompt (instructions for the agent):
Enter your prompt, then press Enter twice when done.

You are a helpful sales assistant for our e-commerce store.
Your role is to help customers find products, answer questions about pricing,
and guide them through the purchase process.
Be friendly, professional, and always try to upsell related products.

Model (default: gpt-4o-mini):
Temperature 0.0-1.0 (default: 0.7): 0.6
Max Tokens (default: 800): 1000

✓ Successfully created agent: sales-agent

You can now assign senders to this agent using:
  node manage-agents.js assign "<sender_name>" sales-agent
```

The agent is immediately available and will automatically load on bot restart.

#### Option 2: Programmatic Creation

Create agents programmatically in your code:

```javascript
const agentManager = require('./agents/AgentManager');

await agentManager.initialize();

await agentManager.createAgent({
    agentId: 'sales-agent',
    name: 'Sales Assistant',
    description: 'Helps customers with product inquiries',
    systemPrompt: 'You are a helpful sales assistant...',
    assignedSenders: ['Customer Name'],
    model: 'gpt-4o-mini',
    temperature: 0.6,
    maxTokens: 1000
});
```

#### Deleting Custom Agents

```bash
node manage-agents.js delete-agent sales-agent
```

**Note:** Built-in agents (`friendly-agent`, `professional-agent`, `support-agent`, `default-agent`) cannot be deleted.

## Available Agents

### FriendlyAgent (`friendly-agent`)
- **Purpose**: Casual, friendly conversations
- **Temperature**: 0.8 (more creative)
- **Max Tokens**: 500
- **Best for**: Personal chats, casual interactions

### ProfessionalAgent (`professional-agent`)
- **Purpose**: Professional business communications
- **Temperature**: 0.6 (balanced)
- **Max Tokens**: 800
- **Best for**: Work-related conversations, formal inquiries

### SupportAgent (`support-agent`)
- **Purpose**: Customer support and inquiries
- **Temperature**: 0.5 (more consistent)
- **Max Tokens**: 1000
- **Best for**: Support tickets, customer questions

### DefaultAgent (`default-agent`)
- **Purpose**: Handles all unassigned senders
- **Temperature**: 0.7 (balanced)
- **Max Tokens**: 800
- **Best for**: General-purpose conversations

## API Reference

### AgentManager

#### `initialize()`
Initializes all agents and connects to MongoDB. Loads both built-in and dynamic agents from database.

#### `handleMessage(message, senderName, isMessageToMe)`
Routes a message to the appropriate agent and returns the response.
- `message` (string): The message content
- `senderName` (string): The name of the sender
- `isMessageToMe` (boolean): Whether the message is directed to the bot. If `false`, the message is ignored and `null` is returned.

#### `createAgent(agentConfig)`
Creates a new custom agent dynamically.
- `agentConfig` (object):
  - `agentId` (string, required): Unique identifier
  - `name` (string, required): Display name
  - `description` (string): Agent description
  - `systemPrompt` (string, required): Instructions for the agent
  - `assignedSenders` (array): Array of sender names
  - `model` (string): OpenAI model (default: 'gpt-4o-mini')
  - `temperature` (number): 0.0-1.0 (default: 0.7)
  - `maxTokens` (number): Max response length (default: 800)
  - `toolsEnabled` (boolean): Enable tools for this agent (default: false)
  - `enabledTools` (array): Array of tool names to enable (e.g., ['query_notion'])

Returns: The created DynamicAgent instance

#### `deleteAgent(agentId)`
Deletes a custom agent. Built-in agents cannot be deleted.

#### `assignSenderToAgent(senderName, agentId)`
Assigns a specific sender (by name) to an agent.

#### `unassignSender(senderName, agentId)`
Removes sender assignment from an agent.

#### `clearHistory(senderName, agentId)`
Clears conversation history for a sender with a specific agent.

#### `getAgentList()`
Returns list of all available agents (built-in and custom).

#### `shutdown()`
Disconnects from MongoDB gracefully.

### BaseAgent

#### `initialize()`
Loads or creates agent profile from database.

#### `handleMessage(message, senderName)`
Processes a message and returns AI response.

#### `updateProfile(updates)`
Updates agent profile in database.

#### `assignSender(senderName)`
Assigns a sender (by name) to this agent.

#### `unassignSender(senderName)`
Removes sender from this agent.

#### `clearHistory(senderName)`
Clears conversation history for a sender.

#### `getConversations()`
Gets all conversations handled by this agent.

## Configuration

### OpenAI Models

You can use different OpenAI models for different agents:
- `gpt-4o-mini` - Fast and cost-effective (recommended for most use cases)
- `gpt-4o` - More capable but slower and more expensive
- `gpt-3.5-turbo` - Budget option

### Temperature Settings

- **0.0-0.3**: Very consistent, factual responses (good for support)
- **0.4-0.7**: Balanced creativity and consistency (good for general use)
- **0.8-1.0**: More creative and varied responses (good for casual chat)

### Max Tokens

Controls the maximum length of responses:
- **300-500**: Short, concise responses
- **500-800**: Medium-length responses
- **800-1500**: Detailed, comprehensive responses

### Agent Tools

Agents can be configured to use tools via OpenAI function calling. Tools extend agent capabilities beyond conversation.

#### Available Tools

- **query_notion**: Search and retrieve content from Notion workspace
  - See [NOTION_INTEGRATION.md](./NOTION_INTEGRATION.md) for detailed documentation

#### Enabling Tools for an Agent

When creating an agent:

```javascript
await agentManager.createAgent({
    agentId: 'knowledge-agent',
    name: 'Knowledge Assistant',
    systemPrompt: 'You are a helpful assistant with access to Notion...',
    toolsEnabled: true,
    enabledTools: ['query_notion']
});
```

Or update an existing agent:

```javascript
const agent = agentManager.agents.find(a => a.agentId === 'my-agent');
await agent.updateProfile({
    toolsEnabled: true,
    enabledTools: ['query_notion']
});
```

#### How Tools Work

1. Agent receives a user message
2. OpenAI determines if a tool should be called based on the message and system prompt
3. If needed, the tool is executed automatically
4. Tool results are passed back to OpenAI
5. OpenAI generates a final response incorporating the tool results
6. User receives the enhanced response

#### Creating Custom Tools

See [NOTION_INTEGRATION.md](./NOTION_INTEGRATION.md) for examples of creating custom tools.

### Message Filtering (isMessageToMe)

By default, the bot only responds to messages sent directly to your WhatsApp number. You can customize this behavior in `start.js`:

**Current logic:**
```javascript
const isMessageToMe = messageTo === "6597772291@c.us" ? true : false;
```

**Alternative configurations:**

1. **Respond to all messages:**
```javascript
const isMessageToMe = true; // Respond to all messages
```

2. **Respond to specific groups:**
```javascript
const isMessageToMe = messageTo.includes('@g.us'); // Only respond in groups
```

3. **Respond to messages with specific keywords:**
```javascript
const isMessageToMe = messageContent.toLowerCase().includes('@bot') ||
                      messageTo === "6597772291@c.us";
```

4. **Respond to specific senders only:**
```javascript
const allowedSenders = ['John Doe', 'Jane Smith'];
const isMessageToMe = allowedSenders.includes(senderName);
```

5. **Respond to direct messages and mentioned in groups:**
```javascript
const isMessageToMe = messageTo === "6597772291@c.us" ||
                      msg.mentionedIds?.includes(client.info.wid._serialized);
```

## Troubleshooting

### Connection Issues

If you see MongoDB connection errors:
1. Check your `MONGODB_URI` in `.env`
2. Ensure your IP is whitelisted in MongoDB Atlas
3. Verify your database credentials

### OpenAI API Errors

If you see OpenAI errors:
1. Check your `OPENAI_API_KEY` in `.env`
2. Verify you have API credits available
3. Check rate limits

### Agent Not Responding

1. Check if AgentManager initialized successfully
2. Verify the agent is registered in AgentManager
3. Check console logs for specific errors

## Best Practices

1. **Profile Management**: Regularly review and update agent profiles based on performance
2. **History Cleanup**: Periodically clean old conversation history to save database space
3. **Monitoring**: Monitor token usage and API costs
4. **Error Handling**: All messages have error handling to prevent bot crashes
5. **Graceful Shutdown**: Use CTRL+C to gracefully shutdown and disconnect from MongoDB

## Future Enhancements

Potential improvements you can add:
- Admin commands via WhatsApp to manage agents
- Analytics dashboard for conversation metrics
- Agent performance tracking
- Multi-language support
- Webhook integration for external systems
- Agent hand-off mechanisms
- Sentiment analysis
- Automated agent selection based on message content
