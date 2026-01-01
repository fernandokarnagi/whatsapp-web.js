const database = require('../utils/database');
const FriendlyAgent = require('./FriendlyAgent');
const ProfessionalAgent = require('./ProfessionalAgent');
const SupportAgent = require('./SupportAgent');
const DefaultAgent = require('./DefaultAgent');
const DynamicAgent = require('./DynamicAgent');
const AgentProfile = require('../models/AgentProfile');
const { initializeTools } = require('../tools');

class AgentManager {
    constructor() {
        this.agents = [];
        this.defaultAgent = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Initialize tools first
            initializeTools();

            // Connect to database
            await database.connect();

            // // Initialize all agents
            // const friendlyAgent = new FriendlyAgent();
            // await friendlyAgent.initialize();
            // this.agents.push(friendlyAgent);

            // const professionalAgent = new ProfessionalAgent();
            // await professionalAgent.initialize();
            // this.agents.push(professionalAgent);

            // const supportAgent = new SupportAgent();
            // await supportAgent.initialize();
            // this.agents.push(supportAgent);

            // // Initialize default agent
            // this.defaultAgent = new DefaultAgent();
            // await this.defaultAgent.initialize();

            // Load dynamic agents from database
            await this.loadDynamicAgents();

            this.initialized = true;
            console.log('AgentManager initialized with', this.agents.length, 'agents (including dynamic agents)');
        } catch (error) {
            console.error('Failed to initialize AgentManager:', error);
            throw error;
        }
    }

    async loadDynamicAgents() {
        try {
            // Get all agent profiles from database
            const allProfiles = await AgentProfile.getAllProfiles();

            // Filter out the built-in agents
            // const builtInAgentIds = ['friendly-agent', 'professional-agent', 'support-agent', 'default-agent'];
            // const dynamicProfiles = allProfiles.filter(profile => !builtInAgentIds.includes(profile.agentId));

            // Create and initialize dynamic agents
            for (const profile of allProfiles) {
                const dynamicAgent = new DynamicAgent({
                    agentId: profile.agentId,
                    name: profile.name,
                    description: profile.description,
                    systemPrompt: profile.systemPrompt,
                    assignedSenders: profile.assignedSenders,
                    model: profile.model,
                    temperature: profile.temperature,
                    maxTokens: profile.maxTokens,
                    toolsEnabled: profile.toolsEnabled || false,
                    enabledTools: profile.enabledTools || []
                });

                await dynamicAgent.initialize();
                this.agents.push(dynamicAgent);
                console.log(`Loaded dynamic agent: ${profile.agentId}`);
            }
        } catch (error) {
            console.error('Error loading dynamic agents:', error);
            // Don't throw - just log the error and continue
        }
    }

    async createAgent(agentConfig) {
        if (!this.initialized) {
            throw new Error('AgentManager not initialized. Call initialize() first.');
        }

        // Validate required fields
        if (!agentConfig.agentId || !agentConfig.name || !agentConfig.systemPrompt) {
            throw new Error('Agent must have agentId, name, and systemPrompt');
        }

        // Check if agent already exists
        const existingAgent = this.agents.find(a => a.agentId === agentConfig.agentId);
        if (existingAgent) {
            throw new Error(`Agent with ID ${agentConfig.agentId} already exists`);
        }

        try {
            // Create the agent profile in database
            const profile = await AgentProfile.createProfile({
                agentId: agentConfig.agentId,
                name: agentConfig.name,
                description: agentConfig.description || '',
                systemPrompt: agentConfig.systemPrompt,
                assignedSenders: agentConfig.assignedSenders || [],
                model: agentConfig.model || 'gpt-4o-mini',
                temperature: agentConfig.temperature || 0.7,
                maxTokens: agentConfig.maxTokens || 800,
                toolsEnabled: agentConfig.toolsEnabled || false,
                enabledTools: agentConfig.enabledTools || []
            });

            // Create and initialize the dynamic agent
            const dynamicAgent = new DynamicAgent({
                agentId: profile.agentId,
                name: profile.name,
                description: profile.description,
                systemPrompt: profile.systemPrompt,
                assignedSenders: profile.assignedSenders,
                model: profile.model,
                temperature: profile.temperature,
                maxTokens: profile.maxTokens,
                toolsEnabled: profile.toolsEnabled,
                enabledTools: profile.enabledTools
            });

            await dynamicAgent.initialize();
            this.agents.push(dynamicAgent);

            console.log(`Created new agent: ${agentConfig.agentId}`);
            return dynamicAgent;
        } catch (error) {
            console.error('Error creating agent:', error);
            throw error;
        }
    }

    async deleteAgent(agentId) {
        if (!this.initialized) {
            throw new Error('AgentManager not initialized. Call initialize() first.');
        }

        // Prevent deletion of built-in agents
        const builtInAgentIds = ['friendly-agent', 'professional-agent', 'support-agent', 'default-agent'];
        if (builtInAgentIds.includes(agentId)) {
            throw new Error('Cannot delete built-in agents');
        }

        // Find and remove the agent
        const agentIndex = this.agents.findIndex(a => a.agentId === agentId);
        if (agentIndex === -1) {
            throw new Error(`Agent ${agentId} not found`);
        }

        // Delete from database
        await AgentProfile.deleteProfile(agentId);

        // Remove from agents array
        this.agents.splice(agentIndex, 1);

        console.log(`Deleted agent: ${agentId}`);
        return true;
    }

    async handleMessage(message, senderNumber, senderName, isMessageToMe = false) {
        if (!this.initialized) {
            throw new Error('AgentManager not initialized. Call initialize() first.');
        }

        try {
            // Only respond if the message is directed to the bot
            if (!isMessageToMe) {
                console.log(`Message from ${senderName} (${senderNumber}) is not directed to me, ignoring...`);
                return null;
            }

            // Find the appropriate agent for this sender
            const agent = this.findAgentForSender(senderNumber);

            console.log(`Routing message from ${senderName} (${senderNumber}) to agent: ${agent?.agentId || 'none'}`);
            let response;

            if (agent)
                // Handle the message with the selected agent
                response = await agent.handleMessage(message, senderNumber, senderName);
            else
                response = "noagentfound";

            return response;
        } catch (error) {
            console.error('Error handling message in AgentManager:', error);
            // Return a friendly error message
            return 'Sorry, I encountered an error processing your message. Please try again.';
        }
    }

    findAgentForSender(senderNumber) {
        // Try to find an agent specifically assigned to this sender
        for (const agent of this.agents) {
            if (agent.isAssignedTo(senderNumber)) {
                return agent;
            }
        }

        // Fall back to default agent
        return null;
    }

    async assignSenderToAgent(senderNumber, agentId) {
        const agent = this.agents.find(a => a.agentId === agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        await agent.assignSender(senderNumber);
        console.log(`Assigned sender ${senderNumber} to agent ${agentId}`);
        return true;
    }

    async unassignSender(senderNumber, agentId) {
        const agent = this.agents.find(a => a.agentId === agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        await agent.unassignSender(senderNumber);
        console.log(`Unassigned sender ${senderNumber} from agent ${agentId}`);
        return true;
    }

    async clearHistory(senderNumber, agentId) {
        const agent = this.agents.find(a => a.agentId === agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        await agent.clearHistory(senderNumber);
        console.log(`Cleared history for sender ${senderNumber} with agent ${agentId}`);
        return true;
    }

    getAgentList() {
        return this.agents.map(agent => ({
            agentId: agent.agentId,
            name: agent.profile?.name,
            description: agent.profile?.description,
            assignedSenders: agent.profile?.assignedSenders || []
        }));
    }

    async shutdown() {
        await database.disconnect();
        console.log('AgentManager shut down');
    }
}

module.exports = new AgentManager();
