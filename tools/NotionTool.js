const BaseTool = require('./BaseTool');
const notionService = require('../utils/notionService');

/**
 * NotionTool - Tool for querying Notion workspace
 * Provides search and retrieval capabilities for Notion pages
 */
class NotionTool extends BaseTool {
    constructor() {
        super({
            name: 'query_notion',
            description: 'Search and retrieve content from Notion workspace. Use this tool when users ask about information that might be stored in Notion pages or databases.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['search', 'get_page', 'query_database'],
                        description: 'The action to perform: "search" to search for pages, "get_page" to retrieve a specific page by ID, "query_database" to query a database'
                    },
                    query: {
                        type: 'string',
                        description: 'Search query or page ID. Required for "search" and "get_page" actions'
                    },
                    database_id: {
                        type: 'string',
                        description: 'Database ID. Required for "query_database" action'
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of results to return (default: 5)'
                    }
                },
                required: ['action']
            }
        });

        // Initialize Notion service
        try {
            notionService.initialize();
            console.log('NotionTool initialized successfully');
        } catch (error) {
            console.error('Failed to initialize NotionTool:', error.message);
            console.error('Make sure NOTION_API_KEY is set in your .env file');
        }
    }

    async execute(args) {
        const { action, query, database_id, limit = 5 } = args;

        try {
            switch (action) {
            case 'search':
                return await this.searchPages(query, limit);
            case 'get_page':
                return await this.getPage(query);
            case 'query_database':
                return await this.queryDatabase(database_id, limit);
            default:
                throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error('Error in NotionTool.execute:', error);
            return {
                error: true,
                message: error.message
            };
        }
    }

    async searchPages(query, limit) {
        if (!query) {
            return {
                error: true,
                message: 'Query is required for search action'
            };
        }

        try {
            const pages = await notionService.searchPages(query, { limit });

            if (pages.length === 0) {
                return {
                    found: 0,
                    message: 'No pages found matching your query'
                };
            }

            const results = [];
            for (const page of pages) {
                const title = notionService.extractPageTitle(page);
                const url = page.url;

                // Get a preview of the page content
                try {
                    const { content } = await notionService.getPageContent(page.id);
                    const preview = notionService.extractTextFromBlocks(content.slice(0, 2));

                    results.push({
                        id: page.id,
                        title,
                        url,
                        preview: preview.substring(0, 200)
                    });
                } catch (error) {
                    results.push({
                        id: page.id,
                        title,
                        url,
                        preview: null
                    });
                }
            }

            return {
                found: pages.length,
                pages: results
            };
        } catch (error) {
            console.error('Error in NotionTool.searchPages:', error.message);
            return {
                error: true,
                message: error.message,
                code: 'NOTION_SEARCH_ERROR'
            };
        }
    }

    async getPage(pageId) {
        if (!pageId) {
            return {
                error: true,
                message: 'Page ID is required for get_page action'
            };
        }

        try {
            // Extract page ID from URL if provided
            const pageIdMatch = pageId.match(/notion\.so\/[^\s]*-([a-f0-9]{32})/);
            const cleanPageId = pageIdMatch ? pageIdMatch[1] : pageId;

            const markdown = await notionService.getPageAsMarkdown(cleanPageId);

            // Truncate if too long
            const maxLength = 2000;
            const truncated = markdown.length > maxLength;

            return {
                content: truncated ? markdown.substring(0, maxLength) : markdown,
                truncated,
                full_length: markdown.length
            };
        } catch (error) {
            console.error('Error in NotionTool.getPage:', error.message);
            return {
                error: true,
                message: error.message,
                code: 'NOTION_GET_PAGE_ERROR'
            };
        }
    }

    async queryDatabase(databaseId, limit) {
        if (!databaseId) {
            return {
                error: true,
                message: 'Database ID is required for query_database action'
            };
        }

        try {
            const results = await notionService.queryDatabase(databaseId, { limit });

            const items = results.slice(0, limit).map(item => ({
                id: item.id,
                title: notionService.extractPageTitle(item),
                url: item.url
            }));

            return {
                found: results.length,
                items
            };
        } catch (error) {
            console.error('Error in NotionTool.queryDatabase:', error.message);
            return {
                error: true,
                message: error.message,
                code: 'NOTION_QUERY_ERROR'
            };
        }
    }
}

module.exports = NotionTool;
