const toolRegistry = require('./ToolRegistry');
const NotionTool = require('./NotionTool');

/**
 * Initialize all tools
 * Registers all available tools with the ToolRegistry
 */
function initializeTools() {
    console.log('Initializing tools...');

    // Register Notion tool
    const notionTool = new NotionTool();
    toolRegistry.registerTool(notionTool);

    // Register additional tools here as they are created
    // Example:
    // const weatherTool = new WeatherTool();
    // toolRegistry.registerTool(weatherTool);

    console.log(`Initialized ${toolRegistry.getAllTools().length} tool(s)`);
}

module.exports = {
    initializeTools,
    toolRegistry
};
