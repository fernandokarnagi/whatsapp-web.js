const BaseAgent = require('./BaseAgent');

/**
 * FriendlyAgent - A friendly conversational agent
 * Designed for casual, friendly conversations
 */
class FriendlyAgent extends BaseAgent {
    constructor() {
        super('friendly-agent', {
            name: 'Friendly Assistant',
            description: 'A warm and friendly conversational agent for casual chats',
            systemPrompt: `You are a friendly and warm conversational assistant.
You engage in casual, friendly conversations while being helpful and supportive.
Keep your responses conversational, warm, and personable.
Use a friendly tone and show genuine interest in the conversation.
Keep responses concise and natural.`,
            assignedSenders: [], // Will be assigned dynamically
            model: 'gpt-4o-mini',
            temperature: 0.8,
            maxTokens: 500
        });
    }

    async handleMessage(message, senderNumber, senderName) {
        console.log(`FriendlyAgent handling message from ${senderName}`);
        return await super.handleMessage(message, senderNumber, senderName);
    }
}

module.exports = FriendlyAgent;
