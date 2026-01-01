const database = require('../utils/database');

class IncomingMessage {
    constructor() {
        this.collectionName = 'incoming_messages';
    }

    async getCollection() {
        return await database.getCollection(this.collectionName);
    }

    async saveMessage(messageData) {
        const collection = await this.getCollection();
        const message = {
            messageId: messageData.messageId || null,
            from: messageData.from,
            to: messageData.to,
            senderName: messageData.senderName,
            body: messageData.body,
            type: messageData.type || 'text',
            timestamp: messageData.timestamp || new Date(),
            hasMedia: messageData.hasMedia || false,
            isForwarded: messageData.isForwarded || false,
            isStatus: messageData.isStatus || false,
            isStarred: messageData.isStarred || false,
            broadcast: messageData.broadcast || false,
            fromMe: messageData.fromMe || false,
            hasQuotedMsg: messageData.hasQuotedMsg || false,
            location: messageData.location || null,
            vCards: messageData.vCards || null,
            mentionedIds: messageData.mentionedIds || null,
            isGif: messageData.isGif || false,
            links: messageData.links || null,
            rawData: messageData.rawData || null,
            createdAt: new Date()
        };

        try {
            const result = await collection.insertOne(message);
            return { ...message, _id: result.insertedId };
        } catch (error) {
            console.error('Error saving incoming message:', error);
            throw error;
        }
    }

    async getMessagesByNumber(phoneNumber, limit = 100) {
        const collection = await this.getCollection();
        return await collection
            .find({ from: phoneNumber })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    }

    async getMessagesByDateRange(startDate, endDate) {
        const collection = await this.getCollection();
        return await collection
            .find({
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            })
            .sort({ timestamp: -1 })
            .toArray();
    }

    async getRecentMessages(limit = 50) {
        const collection = await this.getCollection();
        return await collection
            .find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    }

    async deleteOldMessages(daysOld = 90) {
        const collection = await this.getCollection();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await collection.deleteMany({
            timestamp: { $lt: cutoffDate }
        });
        return result.deletedCount;
    }

    async getMessageCount() {
        const collection = await this.getCollection();
        return await collection.countDocuments({});
    }

    async getMessageStats() {
        const collection = await this.getCollection();
        return await collection
            .aggregate([
                {
                    $group: {
                        _id: '$from',
                        senderName: { $last: '$senderName' },
                        messageCount: { $sum: 1 },
                        lastMessage: { $last: '$body' },
                        lastTimestamp: { $last: '$timestamp' }
                    }
                },
                { $sort: { messageCount: -1 } }
            ])
            .toArray();
    }
}

module.exports = new IncomingMessage();
