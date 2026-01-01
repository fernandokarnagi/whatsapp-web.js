/**
 * BaseTool - Base class for all agent tools
 * Tools can be used by agents via OpenAI function calling
 */
class BaseTool {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.parameters = config.parameters;
    }

    /**
     * Get OpenAI function definition for this tool
     * @returns {object} OpenAI function definition
     */
    getFunctionDefinition() {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: this.parameters
            }
        };
    }

    /**
     * Execute the tool with given arguments
     * @param {object} args - Arguments for the tool
     * @returns {Promise<any>} Tool execution result
     */
    async execute(args) {
        throw new Error('execute() must be implemented by subclass');
    }
}

module.exports = BaseTool;
