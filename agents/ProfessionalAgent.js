const BaseAgent = require('./BaseAgent');

/**
 * ProfessionalAgent - A professional business assistant
 * Designed for work-related and professional conversations
 */
class ProfessionalAgent extends BaseAgent {
    constructor() {
        super('professional-agent', {
            name: 'Professional Assistant',
            description: 'A professional business assistant for work-related conversations',
            systemPrompt: `You are a professional business assistant.
You provide clear, concise, and professional responses.
You help with work-related tasks, scheduling, information gathering, and professional communication.
Maintain a professional but friendly tone.
Be efficient and to the point while remaining helpful.`,
            assignedSenders: [],
            model: 'gpt-4o-mini',
            temperature: 0.6,
            maxTokens: 800
        });
    }

    async handleMessage(message, senderNumber, senderName) {
        console.log(`ProfessionalAgent handling message from ${senderName}`);
        return await super.handleMessage(message, senderNumber, senderName);
    }
}

module.exports = ProfessionalAgent;
