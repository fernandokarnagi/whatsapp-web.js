const database = require('../utils/database');

class ConversationHistory {
    constructor() {
        this.collectionName = 'conversation_history';
    }

    async getCollection() {
        return await database.getCollection(this.collectionName);
    }

    async addMessage(messageData) {
        const collection = await this.getCollection();
        const message = {
            agentId: messageData.agentId,
            senderNumber: messageData.senderNumber,
            senderName: messageData.senderName,
            role: messageData.role, // 'user' or 'assistant'
            content: messageData.content,
            timestamp: new Date(),
            messageId: messageData.messageId || null,
            metadata: messageData.metadata || {}
        };

        const result = await collection.insertOne(message);
        return { ...message, _id: result.insertedId };
    }

    async getHistory(agentId, senderNumber, limit = 50) {
        const collection = await this.getCollection();
        return await collection
            .find({
                agentId,
                senderNumber
            })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    }

    async getRecentHistory(agentId, senderNumber, limit = 10) {
        const history = await this.getHistory(agentId, senderNumber, limit);
        // Reverse to get chronological order (oldest first)
        return history.reverse();
    }

    async clearHistory(agentId, senderNumber) {
        const collection = await this.getCollection();
        const result = await collection.deleteMany({
            agentId,
            senderNumber
        });
        return result.deletedCount;
    }

    async getConversationsByAgent(agentId) {
        const collection = await this.getCollection();
        return await collection
            .aggregate([
                { $match: { agentId } },
                {
                    $group: {
                        _id: '$senderNumber',
                        senderName: { $last: '$senderName' },
                        lastMessage: { $last: '$content' },
                        lastTimestamp: { $last: '$timestamp' },
                        messageCount: { $sum: 1 }
                    }
                },
                { $sort: { lastTimestamp: -1 } }
            ])
            .toArray();
    }

    async deleteOldMessages(daysOld = 30) {
        const collection = await this.getCollection();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await collection.deleteMany({
            timestamp: { $lt: cutoffDate }
        });
        return result.deletedCount;
    }

    async getMessageCount(agentId, senderNumber) {
        const collection = await this.getCollection();
        return await collection.countDocuments({
            agentId,
            senderNumber
        });
    }
}

module.exports = new ConversationHistory();
