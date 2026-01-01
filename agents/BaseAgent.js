const OpenAI = require('openai');
const AgentProfile = require('../models/AgentProfile');
const ConversationHistory = require('../models/ConversationHistory');
const toolRegistry = require('../tools/ToolRegistry');

class BaseAgent {
    constructor(agentId, config = {}) {
        this.agentId = agentId;
        this.profile = null;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.config = config;
        this.tools = config.tools || [];
    }

    async initialize() {
        // Load agent profile from database
        this.profile = await AgentProfile.getProfile(this.agentId);

        if (!this.profile) {
            // Create default profile if not exists
            this.profile = await this.createDefaultProfile();
        }

        console.log(`Agent ${this.agentId} initialized with profile:`, this.profile.name);
        return this;
    }

    async createDefaultProfile() {
        const defaultProfile = {
            agentId: this.agentId,
            name: this.config.name || `Agent ${this.agentId}`,
            description: this.config.description || 'A helpful assistant',
            systemPrompt: this.config.systemPrompt || 'You are a helpful assistant.',
            assignedSenders: this.config.assignedSenders || [],
            model: this.config.model || 'gpt-4o-mini',
            temperature: this.config.temperature || 0.7,
            maxTokens: this.config.maxTokens || 1000
        };

        return await AgentProfile.createProfile(defaultProfile);
    }

    async handleMessage(message, senderNumber, senderName) {
        try {
            // Save user message to history
            await ConversationHistory.addMessage({
                agentId: this.agentId,
                senderNumber,
                senderName,
                role: 'user',
                content: message,
                messageId: null
            });

            // Get conversation history
            const history = await ConversationHistory.getRecentHistory(
                this.agentId,
                senderNumber,
                10 // Last 10 messages
            );

            // Build messages array for OpenAI
            const messages = this.buildMessages(history);

            // Call OpenAI API
            const response = await this.callOpenAI(messages);

            // Save assistant response to history
            await ConversationHistory.addMessage({
                agentId: this.agentId,
                senderNumber,
                senderName,
                role: 'assistant',
                content: response,
                messageId: null
            });

            return response;
        } catch (error) {
            console.error(`Error in agent ${this.agentId} handling message:`, error);
            throw error;
        }
    }

    buildMessages(history) {
        const messages = [
            {
                role: 'system',
                content: this.profile.systemPrompt
            }
        ];

        // Add conversation history
        for (const msg of history) {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }

        return messages;
    }

    async callOpenAI(messages) {
        // Get tools if enabled for this agent
        const toolsEnabled = this.profile.toolsEnabled || this.config.toolsEnabled || false;
        const enabledToolNames = this.profile.enabledTools || this.config.enabledTools || [];

        console.log(`Agent ${this.agentId} calling OpenAI with toolsEnabled=${toolsEnabled} and enabledTools=${enabledToolNames}`);

        let tools = [];
        if (toolsEnabled && enabledToolNames.length > 0) {
            console.log("enabledToolNames: ", enabledToolNames)
            // Get function definitions for enabled tools
            tools = enabledToolNames
                .map(toolName => {
                    const tool = toolRegistry.getTool(toolName);
                    return tool ? tool.getFunctionDefinition() : null;
                })
                .filter(def => def !== null);
        }

        console.log(`Agent ${this.agentId} using tools:`, tools);
        const requestOptions = {
            model: this.profile.model,
            messages: messages,
            temperature: this.profile.temperature,
            max_tokens: this.profile.maxTokens
        };

        // Add tools if available
        if (tools.length > 0) {
            requestOptions.tools = tools;
            requestOptions.tool_choice = 'auto';
        }

        console.log(`Agent ${this.agentId} sending request to OpenAI:`, requestOptions);
        
        const completion = await this.openai.chat.completions.create(requestOptions);

        const responseMessage = completion.choices[0].message;

        console.log(`Agent ${this.agentId} received response from OpenAI:`, responseMessage);

        // Check if the model wants to call a tool
        if (responseMessage.tool_calls) {
            // Execute tool calls
            const toolResults = await this.executeToolCalls(responseMessage.tool_calls);

            // Add assistant's tool call message to conversation
            messages.push(responseMessage);

            // Add tool results to conversation
            for (const toolResult of toolResults) {
                messages.push({
                    role: 'tool',
                    tool_call_id: toolResult.tool_call_id,
                    content: JSON.stringify(toolResult.result)
                });
            }

            // Make another call to get the final response
            const secondCompletion = await this.openai.chat.completions.create({
                model: this.profile.model,
                messages: messages,
                temperature: this.profile.temperature,
                max_tokens: this.profile.maxTokens
            });

            return secondCompletion.choices[0].message.content;
        }

        return responseMessage.content;
    }

    async executeToolCalls(toolCalls) {
        const results = [];

        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`Executing tool: ${functionName} with args:`, functionArgs);

            try {
                const result = await toolRegistry.executeTool(functionName, functionArgs);
                results.push({
                    tool_call_id: toolCall.id,
                    result: result
                });
            } catch (error) {
                console.error(`Error executing tool ${functionName}:`, error);
                results.push({
                    tool_call_id: toolCall.id,
                    result: {
                        error: true,
                        message: error.message
                    }
                });
            }
        }

        return results;
    }

    async updateProfile(updates) {
        const success = await AgentProfile.updateProfile(this.agentId, updates);
        if (success) {
            this.profile = await AgentProfile.getProfile(this.agentId);
        }
        return success;
    }

    async assignSender(senderNumber) {
        return await AgentProfile.assignSender(this.agentId, senderNumber);
    }

    async unassignSender(senderNumber) {
        return await AgentProfile.unassignSender(this.agentId, senderNumber);
    }

    async clearHistory(senderNumber) {
        return await ConversationHistory.clearHistory(this.agentId, senderNumber);
    }

    async getConversations() {
        return await ConversationHistory.getConversationsByAgent(this.agentId);
    }

    isAssignedTo(senderNumber) {
        if (!this.profile) {
            return false;
        }
        return this.profile.assignedSenders.includes(senderNumber);
    }
}

module.exports = BaseAgent;
