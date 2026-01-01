const BaseAgent = require('./BaseAgent');

/**
 * DynamicAgent - A dynamically created agent with custom instructions
 * Can be created and configured at runtime without code changes
 * Supports tool calling via OpenAI function calling
 */
class DynamicAgent extends BaseAgent {
    constructor(config) {
        super(config.agentId, {
            name: config.name,
            description: config.description,
            systemPrompt: config.systemPrompt,
            assignedSenders: config.assignedSenders || [],
            model: config.model || 'gpt-4o-mini',
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens || 800,
            toolsEnabled: config.toolsEnabled || false,
            enabledTools: config.enabledTools || []
        });
    }

    async handleMessage(message, senderNumber, senderName) {
        console.log(`${this.config.name} handling message from ${senderName}`);
        return await super.handleMessage(message, senderNumber, senderName);
    }
}

module.exports = DynamicAgent;
