/**
 * ToolRegistry - Manages all available tools for agents
 * Provides registration, lookup, and execution of tools
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    /**
     * Register a tool
     * @param {BaseTool} tool - Tool instance to register
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
        console.log(`Registered tool: ${tool.name}`);
    }

    /**
     * Get a tool by name
     * @param {string} name - Tool name
     * @returns {BaseTool|null} Tool instance or null if not found
     */
    getTool(name) {
        return this.tools.get(name) || null;
    }

    /**
     * Get all registered tools
     * @returns {Array<BaseTool>} Array of all tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * Get OpenAI function definitions for all tools
     * @returns {Array<object>} Array of OpenAI function definitions
     */
    getFunctionDefinitions() {
        return this.getAllTools().map(tool => tool.getFunctionDefinition());
    }

    /**
     * Execute a tool by name
     * @param {string} name - Tool name
     * @param {object} args - Tool arguments
     * @returns {Promise<any>} Tool execution result
     */
    async executeTool(name, args) {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }

        try {
            return await tool.execute(args);
        } catch (error) {
            console.error(`Error executing tool ${name}:`, error);
            throw error;
        }
    }
}

module.exports = new ToolRegistry();
