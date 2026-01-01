const BaseAgent = require('./BaseAgent');

/**
 * SupportAgent - A customer support agent
 * Designed for handling customer inquiries and support requests
 */
class SupportAgent extends BaseAgent {
    constructor() {
        super('support-agent', {
            name: 'Customer Support Assistant',
            description: 'A helpful customer support agent for handling inquiries and issues',
            systemPrompt: `You are a helpful customer support assistant.
You assist customers with their questions, concerns, and issues in a patient and understanding manner.
Always be polite, empathetic, and solution-oriented.
If you don't know something, be honest about it and offer to help find the information.
Keep responses clear and actionable.`,
            assignedSenders: [],
            model: 'gpt-4o-mini',
            temperature: 0.5,
            maxTokens: 1000
        });
    }

    async handleMessage(message, senderNumber, senderName) {
        console.log(`SupportAgent handling message from ${senderName}`);
        return await super.handleMessage(message, senderNumber, senderName);
    }
}

module.exports = SupportAgent;
