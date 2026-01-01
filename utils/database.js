const { MongoClient } = require('mongodb');

class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        if (this.client) {
            return this.db;
        }

        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        try {
            this.client = new MongoClient(uri);
            await this.client.connect();

            const dbName = process.env.MONGODB_DB_NAME || 'whatsapp_chatbot';
            this.db = this.client.db(dbName);

            console.log('Connected to MongoDB Atlas');
            return this.db;
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('Disconnected from MongoDB');
        }
    }

    getDb() {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    async getCollection(collectionName) {
        const db = this.getDb();
        return db.collection(collectionName);
    }
}

// Export singleton instance
module.exports = new Database();
