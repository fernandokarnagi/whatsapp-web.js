const { Client } = require('@notionhq/client');

class NotionService {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.initialize();
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        const notionApiKey = process.env.NOTION_API_KEY;
        console.log('NOTION_API_KEY:', notionApiKey);
        if (!notionApiKey) {
            throw new Error('NOTION_API_KEY not found in environment variables');
        }

        this.client = new Client({ auth: notionApiKey });
        this.initialized = true;
        console.log('NotionService initialized successfully');
    }

    async searchPages(query, options = {}) {
        if (!this.initialized) {
            this.initialize();
        }

        try {
            const response = await this.client.search({
                query: query,
                filter: {
                    property: 'object',
                    value: 'page'
                },
                sort: {
                    direction: 'descending',
                    timestamp: 'last_edited_time'
                },
                page_size: options.limit || 10
            });

            return response.results;
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API authentication failed. Please check that NOTION_API_KEY is set correctly in your .env file and that the integration has been shared with the required pages.');
            }
            if (error.message.includes('is not a valid UUID.')) {
                throw new Error('Invalid Notion page or database ID provided.');
            }
            console.error('Error searching Notion pages:', error);
            throw error;
        }
    }

    async searchDatabases(query, options = {}) {
        if (!this.initialized) {
            this.initialize();
        }

        try {
            const response = await this.client.search({
                query: query,
                filter: {
                    property: 'object',
                    value: 'database'
                },
                page_size: options.limit || 10
            });

            return response.results;
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API authentication failed. Please check that NOTION_API_KEY is set correctly in your .env file and that the integration has been shared with the required pages.');
            }
            if (error.message.includes('is not a valid UUID.')) {
                throw new Error('Invalid Notion page or database ID provided.');
            }
            console.error('Error searching Notion databases:', error);
            throw error;
        }
    }

    async getPageContent(pageId) {
        if (!this.initialized) {
            this.initialize();
        }

        try {
            // Get page properties
            const page = await this.client.pages.retrieve({ page_id: pageId });

            // Get page blocks (content)
            const blocks = await this.getBlockChildren(pageId);

            return {
                page: page,
                content: blocks
            };
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API authentication failed. Please check that NOTION_API_KEY is set correctly in your .env file and that the integration has been shared with the required pages.');
            }
            if (error.message.includes('is not a valid UUID.')) {
                throw new Error('Invalid Notion page or database ID provided.');
            }
            console.error('Error getting Notion page content:', error);
            throw error;
        }
    }

    async getBlockChildren(blockId) {
        if (!this.initialized) {
            this.initialize();
        }

        try {
            const response = await this.client.blocks.children.list({
                block_id: blockId,
                page_size: 100
            });

            return response.results;
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API authentication failed. Please check that NOTION_API_KEY is set correctly in your .env file and that the integration has been shared with the required pages.');
            }
            if (error.message.includes('is not a valid UUID.')) {
                throw new Error('Invalid Notion page or database ID provided.');
            }
            console.error('Error getting Notion block children:', error);
            throw error;
        }
    }

    async queryDatabase(databaseId, options = {}) {
        if (!this.initialized) {
            this.initialize();
        }

        try {
            const response = await this.client.databases.query({
                database_id: databaseId,
                filter: options.filter || undefined,
                sorts: options.sorts || undefined,
                page_size: options.limit || 100
            });

            return response.results;
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API authentication failed. Please check that NOTION_API_KEY is set correctly in your .env file and that the integration has been shared with the required pages.');
            }
            if (error.message.includes('is not a valid UUID.')) {
                throw new Error('Invalid Notion page or database ID provided.');
            }
            console.error('Error querying Notion database:', error);
            throw error;
        }
    }

    extractTextFromBlocks(blocks) {
        let text = '';

        for (const block of blocks) {
            switch (block.type) {
            case 'paragraph': {
                text += this.extractRichText(block.paragraph.rich_text) + '\n';
                break;
            }
            case 'heading_1': {
                text += '# ' + this.extractRichText(block.heading_1.rich_text) + '\n';
                break;
            }
            case 'heading_2': {
                text += '## ' + this.extractRichText(block.heading_2.rich_text) + '\n';
                break;
            }
            case 'heading_3': {
                text += '### ' + this.extractRichText(block.heading_3.rich_text) + '\n';
                break;
            }
            case 'bulleted_list_item': {
                text += '- ' + this.extractRichText(block.bulleted_list_item.rich_text) + '\n';
                break;
            }
            case 'numbered_list_item': {
                text += '1. ' + this.extractRichText(block.numbered_list_item.rich_text) + '\n';
                break;
            }
            case 'to_do': {
                const checked = block.to_do.checked ? '[x]' : '[ ]';
                text += `${checked} ` + this.extractRichText(block.to_do.rich_text) + '\n';
                break;
            }
            case 'quote': {
                text += '> ' + this.extractRichText(block.quote.rich_text) + '\n';
                break;
            }
            case 'code': {
                text += '```' + block.code.language + '\n';
                text += this.extractRichText(block.code.rich_text) + '\n';
                text += '```\n';
                break;
            }
            default: {
                // Skip unsupported block types
                break;
            }
            }
        }

        return text;
    }

    extractRichText(richTextArray) {
        if (!richTextArray || richTextArray.length === 0) {
            return '';
        }

        return richTextArray.map(rt => rt.plain_text).join('');
    }

    extractPageTitle(page) {
        // Try to get title from different property types
        const properties = page.properties;

        for (const key in properties) {
            const property = properties[key];
            if (property.type === 'title' && property.title.length > 0) {
                return this.extractRichText(property.title);
            }
        }

        return 'Untitled';
    }

    async getPageAsMarkdown(pageId) {
        if (!this.initialized) {
            this.initialize();
        }

        try {
            const { page, content } = await this.getPageContent(pageId);
            const title = this.extractPageTitle(page);
            const text = this.extractTextFromBlocks(content);

            return `# ${title}\n\n${text}`;
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API authentication failed. Please check that NOTION_API_KEY is set correctly in your .env file and that the integration has been shared with the required pages.');
            }
            if (error.message.includes('is not a valid UUID.')) {
                throw new Error('Invalid Notion page or database ID provided.');
            }
            console.error('Error converting Notion page to markdown:', error);
            throw error;
        }
    }
}

module.exports = new NotionService();
