const BaseAgent = require('./BaseAgent');

/**
 * DefaultAgent - A general-purpose default agent
 * Handles messages from unassigned senders
 */
class DefaultAgent extends BaseAgent {
    constructor() {
        super('default-agent', {
            name: 'Default Assistant',
            description: 'A general-purpose assistant for handling all unassigned conversations',
            systemPrompt: `You are a helpful and versatile AI assistant.
You can help with a wide variety of topics and questions.
Be friendly, informative, and adaptive to the conversation context.
Provide clear and helpful responses.`,
            assignedSenders: [],
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 800
        });
    }

    async handleMessage(message, senderNumber, senderName) {
        console.log(`DefaultAgent handling message from ${senderName}`);
        return await super.handleMessage(message, senderNumber, senderName);
    }

    // Override isAssignedTo to return true for all senders (default fallback)
    isAssignedTo(senderNumber) {
        return true;
    }
}

module.exports = DefaultAgent;
