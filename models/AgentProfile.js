const database = require('../utils/database');

class AgentProfile {
    constructor() {
        this.collectionName = 'agent_profiles';
    }

    async getCollection() {
        return await database.getCollection(this.collectionName);
    }

    async createProfile(agentData) {
        const collection = await this.getCollection();
        const profile = {
            agentId: agentData.agentId,
            name: agentData.name,
            description: agentData.description,
            systemPrompt: agentData.systemPrompt,
            assignedSenders: agentData.assignedSenders || [], // Array of sender numbers
            model: agentData.model || 'gpt-4o-mini',
            temperature: agentData.temperature || 0.7,
            maxTokens: agentData.maxTokens || 1000,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await collection.insertOne(profile);
        return { ...profile, _id: result.insertedId };
    }

    async getProfile(agentId) {
        const collection = await this.getCollection();
        return await collection.findOne({ agentId });
    }

    async updateProfile(agentId, updateData) {
        const collection = await this.getCollection();
        const result = await collection.updateOne(
            { agentId },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date()
                }
            }
        );
        return result.modifiedCount > 0;
    }

    async deleteProfile(agentId) {
        const collection = await this.getCollection();
        const result = await collection.deleteOne({ agentId });
        return result.deletedCount > 0;
    }

    async getProfileBySender(senderNumber) {
        const collection = await this.getCollection();
        return await collection.findOne({
            assignedSenders: senderNumber
        });
    }

    async getAllProfiles() {
        const collection = await this.getCollection();
        return await collection.find({}).toArray();
    }

    async assignSender(agentId, senderNumber) {
        const collection = await this.getCollection();
        const result = await collection.updateOne(
            { agentId },
            {
                $addToSet: { assignedSenders: senderNumber },
                $set: { updatedAt: new Date() }
            }
        );
        return result.modifiedCount > 0;
    }

    async unassignSender(agentId, senderNumber) {
        const collection = await this.getCollection();
        const result = await collection.updateOne(
            { agentId },
            {
                $pull: { assignedSenders: senderNumber },
                $set: { updatedAt: new Date() }
            }
        );
        return result.modifiedCount > 0;
    }
}

module.exports = new AgentProfile();
