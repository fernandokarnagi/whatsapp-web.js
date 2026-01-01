require('dotenv').config();
const agentManager = require('./agents/AgentManager');
const readline = require('readline');

async function main() {
    try {
        // Initialize agent manager
        await agentManager.initialize();

        const command = process.argv[2];

        switch (command) {
            case 'list':
                await listAgents();
                break;

            case 'assign':
                const senderNumber = process.argv[3];
                const agentId = process.argv[4];
                if (!senderNumber || !agentId) {
                    console.log('Usage: node manage-agents.js assign <sender_number> <agent_id>');
                    console.log('Example: node manage-agents.js assign "1234567890" friendly-agent');
                } else {
                    await assignSender(senderNumber, agentId);
                }
                break;

            case 'unassign':
                const sender = process.argv[3];
                const agent = process.argv[4];
                if (!sender || !agent) {
                    console.log('Usage: node manage-agents.js unassign <sender_number> <agent_id>');
                } else {
                    await unassignSender(sender, agent);
                }
                break;

            case 'clear-history':
                const senderForHistory = process.argv[3];
                const agentName = process.argv[4];
                if (!senderForHistory || !agentName) {
                    console.log('Usage: node manage-agents.js clear-history <sender_number> <agent_id>');
                } else {
                    await clearHistory(senderForHistory, agentName);
                }
                break;

            case 'conversations':
                const agId = process.argv[3];
                if (!agId) {
                    console.log('Usage: node manage-agents.js conversations <agent_id>');
                } else {
                    await showConversations(agId);
                }
                break;

            case 'create-agent':
                await createAgentInteractive();
                break;

            case 'delete-agent':
                const agentToDelete = process.argv[3];
                if (!agentToDelete) {
                    console.log('Usage: node manage-agents.js delete-agent <agent_id>');
                } else {
                    await deleteAgent(agentToDelete);
                }
                break;

            case 'create-knowledge-agent':
                await createKnowledgeAgent();
                break;

            default:
                showHelp();
        }

        await agentManager.shutdown();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

async function listAgents() {
    const agents = agentManager.getAgentList();

    console.log('\n=== Available Agents ===\n');

    for (const agent of agents) {
        // Get full agent instance to access profile details
        const agentInstance = agentManager.agents.find(a => a.agentId === agent.agentId);

        console.log(`Agent ID: ${agent.agentId}`);
        console.log(`Name: ${agent.name}`);
        console.log(`Description: ${agent.description}`);

        // Show tool information if available
        if (agentInstance && agentInstance.profile) {
            if (agentInstance.profile.toolsEnabled && agentInstance.profile.enabledTools && agentInstance.profile.enabledTools.length > 0) {
                console.log(`Tools: ${agentInstance.profile.enabledTools.join(', ')}`);
            }
        }

        console.log(`Assigned Senders (${agent.assignedSenders.length}):`);

        if (agent.assignedSenders.length > 0) {
            agent.assignedSenders.forEach(sender => {
                console.log(`  - ${sender}`);
            });
        } else {
            console.log('  (none)');
        }
        console.log('');
    }
}

async function assignSender(senderNumber, agentId) {
    await agentManager.assignSenderToAgent(senderNumber, agentId);
    console.log(`✓ Assigned ${senderNumber} to agent ${agentId}`);
}

async function unassignSender(senderNumber, agentId) {
    await agentManager.unassignSender(senderNumber, agentId);
    console.log(`✓ Unassigned ${senderNumber} from agent ${agentId}`);
}

async function clearHistory(senderNumber, agentId) {
    await agentManager.clearHistory(senderNumber, agentId);
    console.log(`✓ Cleared conversation history for ${senderNumber} with agent ${agentId}`);
}

async function showConversations(agentId) {
    const agent = agentManager.agents.find(a => a.agentId === agentId);

    if (!agent) {
        console.log(`Agent ${agentId} not found`);
        return;
    }

    const conversations = await agent.getConversations();

    console.log(`\n=== Conversations for ${agent.profile.name} ===\n`);

    if (conversations.length === 0) {
        console.log('No conversations found.');
        return;
    }

    conversations.forEach(conv => {
        console.log(`Sender: ${conv.senderName || 'Unknown'} (${conv._id})`);
        console.log(`Messages: ${conv.messageCount}`);
        console.log(`Last message: ${conv.lastMessage.substring(0, 50)}${conv.lastMessage.length > 50 ? '...' : ''}`);
        console.log(`Last activity: ${conv.lastTimestamp}`);
        console.log('');
    });
}

function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }));
}

async function createAgentInteractive() {
    console.log('\n=== Create New Agent ===\n');

    const agentId = await question('Agent ID (e.g., sales-agent): ');
    if (!agentId) {
        console.log('Agent ID is required');
        return;
    }

    const name = await question('Agent Name (e.g., Sales Assistant): ');
    if (!name) {
        console.log('Agent name is required');
        return;
    }

    const description = await question('Description: ');

    console.log('\nSystem Prompt (instructions for the agent):');
    console.log('Enter your prompt, then press Enter twice when done.\n');

    let systemPrompt = '';
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise(resolve => {
        let previousLine = '';
        rl.on('line', (line) => {
            if (line === '' && previousLine === '') {
                rl.close();
                resolve();
            } else {
                if (systemPrompt) systemPrompt += '\n';
                systemPrompt += line;
                previousLine = line;
            }
        });
    });

    if (!systemPrompt.trim()) {
        console.log('System prompt is required');
        return;
    }

    const model = await question('Model (default: gpt-4o-mini): ') || 'gpt-4o-mini';
    const tempInput = await question('Temperature 0.0-1.0 (default: 0.7): ');
    const temperature = tempInput ? parseFloat(tempInput) : 0.7;
    const tokensInput = await question('Max Tokens (default: 800): ');
    const maxTokens = tokensInput ? parseInt(tokensInput) : 800;

    // Ask about tools
    const toolsEnabledInput = await question('Enable tools? (yes/no, default: no): ');
    const toolsEnabled = toolsEnabledInput.toLowerCase() === 'yes' || toolsEnabledInput.toLowerCase() === 'y';

    let enabledTools = [];
    if (toolsEnabled) {
        console.log('\nAvailable tools:');
        console.log('  - query_notion: Search and retrieve content from Notion workspace');
        console.log('\nEnter tool names separated by commas (e.g., query_notion)');
        const toolsInput = await question('Enabled tools (default: none): ');
        if (toolsInput.trim()) {
            enabledTools = toolsInput.split(',').map(t => t.trim()).filter(t => t);
        }
    }

    try {
        await agentManager.createAgent({
            agentId,
            name,
            description,
            systemPrompt: systemPrompt.trim(),
            model,
            temperature,
            maxTokens,
            toolsEnabled,
            enabledTools
        });

        console.log(`\n✓ Successfully created agent: ${agentId}`);
        if (toolsEnabled && enabledTools.length > 0) {
            console.log(`✓ Tools enabled: ${enabledTools.join(', ')}`);
        }
        console.log(`\nYou can now assign senders to this agent using:`);
        console.log(`  node manage-agents.js assign "<sender_number>" ${agentId}`);
    } catch (error) {
        console.error(`\n✗ Failed to create agent: ${error.message}`);
    }
}

async function deleteAgent(agentId) {
    try {
        const confirm = await question(`Are you sure you want to delete agent '${agentId}'? (yes/no): `);
        if (confirm.toLowerCase() !== 'yes') {
            console.log('Deletion cancelled');
            return;
        }

        await agentManager.deleteAgent(agentId);
        console.log(`✓ Successfully deleted agent: ${agentId}`);
    } catch (error) {
        console.error(`✗ Failed to delete agent: ${error.message}`);
    }
}

async function createKnowledgeAgent() {
    console.log('\n=== Create Knowledge Agent with Notion Tool ===\n');
    console.log('This will create a pre-configured agent that can search your Notion workspace.\n');

    const agentId = await question('Agent ID (default: knowledge-agent): ') || 'knowledge-agent';
    const name = await question('Agent Name (default: Knowledge Assistant): ') || 'Knowledge Assistant';

    try {
        await agentManager.createAgent({
            agentId,
            name,
            description: 'Helps users find information from Notion workspace',
            systemPrompt: `You are a helpful knowledge assistant with access to a Notion workspace.

When users ask questions:
1. Determine if the information might be in Notion
2. Use the query_notion tool to search for relevant information
3. Summarize the findings in a clear, helpful way
4. Include relevant URLs so users can access the full content
5. If information is not found, suggest alternative searches or ask for clarification

Always cite your sources and be transparent when information is not found.
Be proactive in using the Notion tool when questions could be answered from documentation or knowledge base.`,
            model: 'gpt-4o-mini',
            temperature: 0.5,
            maxTokens: 1500,
            toolsEnabled: true,
            enabledTools: ['query_notion']
        });

        console.log(`\n✓ Successfully created Knowledge Agent!`);
        console.log(`\nAgent Details:`);
        console.log(`  ID: ${agentId}`);
        console.log(`  Name: ${name}`);
        console.log(`  Tools: query_notion (enabled)`);
        console.log(`\nMake sure you have:`);
        console.log(`  1. Set NOTION_API_KEY in your .env file`);
        console.log(`  2. Shared Notion pages with your integration`);
        console.log(`\nYou can now assign senders to this agent using:`);
        console.log(`  node manage-agents.js assign "<sender_number>" ${agentId}`);
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log(`\n⚠ Agent '${agentId}' already exists.`);
            console.log('To update it, delete it first using:');
            console.log(`  node manage-agents.js delete-agent ${agentId}`);
        } else {
            console.error(`\n✗ Failed to create agent: ${error.message}`);
        }
    }
}

function showHelp() {
    console.log(`
Multi-Agent Chatbot Management Tool

Usage: node manage-agents.js <command> [arguments]

Commands:
  list                                      List all agents and their assignments
  create-agent                              Create a new custom agent (interactive)
  create-knowledge-agent                    Create a pre-configured agent with Notion tool
  delete-agent <agent_id>                   Delete a custom agent
  assign <sender_number> <agent_id>         Assign a sender to an agent
  unassign <sender_number> <agent_id>       Unassign a sender from an agent
  clear-history <sender_number> <agent_id>  Clear conversation history
  conversations <agent_id>                  Show all conversations for an agent

Built-in Agent IDs:
  - friendly-agent        (Friendly, casual conversations)
  - professional-agent    (Professional business assistant)
  - support-agent         (Customer support)
  - default-agent         (General purpose)

Available Tools:
  - query_notion          (Search and retrieve content from Notion workspace)

Examples:
  node manage-agents.js list
  node manage-agents.js create-agent
  node manage-agents.js create-knowledge-agent
  node manage-agents.js assign "1234567890" knowledge-agent
  node manage-agents.js conversations friendly-agent
  node manage-agents.js delete-agent my-custom-agent
  node manage-agents.js clear-history "1234567890" friendly-agent

Note: Built-in agents cannot be deleted. Only custom agents created with
      'create-agent' can be removed.
      Use sender WhatsApp number WITHOUT @c.us (e.g., 1234567890) for assign/unassign/clear-history.

Tool Usage:
  When creating an agent with create-agent, you'll be prompted to enable tools.
  For a quick start with Notion tool, use create-knowledge-agent.
  See NOTION_INTEGRATION.md for setup instructions.
`);
}

main();
