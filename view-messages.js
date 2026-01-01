require('dotenv').config();
const database = require('./utils/database');
const IncomingMessage = require('./models/IncomingMessage');

async function main() {
    try {
        // Connect to database
        await database.connect();

        const command = process.argv[2];

        switch (command) {
            case 'recent':
                const limit = parseInt(process.argv[3]) || 50;
                await showRecentMessages(limit);
                break;

            case 'stats':
                await showStats();
                break;

            case 'by-number':
                const phoneNumber = process.argv[3];
                const msgLimit = parseInt(process.argv[4]) || 100;
                if (!phoneNumber) {
                    console.log('Usage: node view-messages.js by-number <phone_number> [limit]');
                    console.log('Example: node view-messages.js by-number "1234567890@c.us" 50');
                } else {
                    await showMessagesByNumber(phoneNumber, msgLimit);
                }
                break;

            case 'count':
                await showCount();
                break;

            case 'cleanup':
                const days = parseInt(process.argv[3]) || 90;
                await cleanupOldMessages(days);
                break;

            default:
                showHelp();
        }

        await database.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

async function showRecentMessages(limit) {
    const messages = await IncomingMessage.getRecentMessages(limit);

    console.log(`\n=== Recent ${limit} Messages ===\n`);

    if (messages.length === 0) {
        console.log('No messages found.');
        return;
    }

    messages.forEach((msg, index) => {
        console.log(`${index + 1}. From: ${msg.senderName || 'Unknown'} (${msg.from})`);
        console.log(`   To: ${msg.to}`);
        console.log(`   Time: ${msg.timestamp}`);
        console.log(`   Type: ${msg.type}`);
        console.log(`   Body: ${msg.body?.substring(0, 100)}${msg.body?.length > 100 ? '...' : ''}`);
        if (msg.hasMedia) console.log(`   📎 Has Media`);
        if (msg.isForwarded) console.log(`   ↗️ Forwarded`);
        console.log('');
    });
}

async function showStats() {
    const stats = await IncomingMessage.getMessageStats();

    console.log('\n=== Message Statistics ===\n');

    if (stats.length === 0) {
        console.log('No messages found.');
        return;
    }

    console.log(`Total unique senders: ${stats.length}\n`);

    stats.forEach((stat, index) => {
        console.log(`${index + 1}. ${stat.senderName || 'Unknown'} (${stat._id})`);
        console.log(`   Messages: ${stat.messageCount}`);
        console.log(`   Last: ${stat.lastMessage?.substring(0, 50)}${stat.lastMessage?.length > 50 ? '...' : ''}`);
        console.log(`   Last activity: ${stat.lastTimestamp}`);
        console.log('');
    });
}

async function showMessagesByNumber(phoneNumber, limit) {
    const messages = await IncomingMessage.getMessagesByNumber(phoneNumber, limit);

    console.log(`\n=== Messages from ${phoneNumber} ===\n`);

    if (messages.length === 0) {
        console.log('No messages found.');
        return;
    }

    messages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.timestamp} - ${msg.type}`);
        console.log(`   ${msg.body}`);
        if (msg.hasMedia) console.log(`   📎 Has Media`);
        console.log('');
    });
}

async function showCount() {
    const count = await IncomingMessage.getMessageCount();
    console.log(`\nTotal messages in database: ${count}\n`);
}

async function cleanupOldMessages(days) {
    console.log(`\nDeleting messages older than ${days} days...`);
    const deletedCount = await IncomingMessage.deleteOldMessages(days);
    console.log(`✓ Deleted ${deletedCount} old messages\n`);
}

function showHelp() {
    console.log(`
Incoming Messages Viewer

Usage: node view-messages.js <command> [arguments]

Commands:
  recent [limit]                Show recent messages (default: 50)
  stats                         Show message statistics by sender
  by-number <number> [limit]    Show messages from specific number
  count                         Show total message count
  cleanup [days]                Delete messages older than X days (default: 90)

Examples:
  node view-messages.js recent 100
  node view-messages.js stats
  node view-messages.js by-number "1234567890@c.us" 50
  node view-messages.js count
  node view-messages.js cleanup 30
`);
}

main();
