require('dotenv').config();

const { Client, Location, Poll, List, Buttons, LocalAuth } = require('./index');
const agentManager = require('./agents/AgentManager');
const IncomingMessage = require('./models/IncomingMessage');

const client = new Client({
    authStrategy: new LocalAuth(),
    // proxyAuthentication: { username: 'username', password: 'password' },
    /**
     * This option changes the browser name from defined in user agent to custom.
     */
    // deviceName: 'Your custom name',
    /**
     * This option changes browser type from defined in user agent to yours. It affects the browser icon
     * that is displayed in 'linked devices' section.
     * Valid value are: 'Chrome' | 'Firefox' | 'IE' | 'Opera' | 'Safari' | 'Edge'.
     * If another value is provided, the browser icon in 'linked devices' section will be gray.
     */
    // browserName: 'Firefox',
    puppeteer: {
        // args: ['--proxy-server=proxy-server-that-requires-authentication.example.com'],
        headless: false,
    },
    // pairWithPhoneNumber: {
    //     phoneNumber: '96170100100' // Pair with phone number (format: <COUNTRY_CODE><PHONE_NUMBER>)
    //     showNotification: true,
    //     intervalMs: 180000 // Time to renew pairing code in milliseconds, defaults to 3 minutes
    // }
});

// client initialize does not finish at ready now.
client.initialize();


client.on('ready', async () => {
    console.log('READY');
    const debugWWebVersion = await client.getWWebVersion();
    console.log(`WWebVersion = ${debugWWebVersion}`);

    client.pupPage.on('pageerror', function (err) {
        console.log('Page error: ' + err.toString());
    });
    client.pupPage.on('error', function (err) {
        console.log('Page error: ' + err.toString());
    });

    // Initialize the agent manager
    try {
        await agentManager.initialize();
        console.log('Multi-agent chatbot system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize agent manager:', error);
    }
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

client.on('qr', async (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
});

client.on('code', (code) => {
    console.log('Pairing code:', code);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    const senderName = msg._data.notifyName || 'Unknown';
    const messageContent = msg.body || '';
    const messageTo = msg.to;
    const senderNumber = msg.from;
    const isMessageToMe = messageTo === "6597772291@c.us" ? true : false;

    console.log(`Message from: ${senderName} (${senderNumber})`, `| To me: ${isMessageToMe}`, `| Content: ${messageContent}`);

    // Save all incoming messages to database
    try {
        await IncomingMessage.saveMessage({
            messageId: msg.id._serialized,
            from: senderNumber,
            to: messageTo,
            senderName: senderName,
            body: messageContent,
            type: msg.type,
            timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
            hasMedia: msg.hasMedia,
            isForwarded: msg.isForwarded,
            isStatus: msg.isStatus,
            isStarred: msg.isStarred,
            broadcast: msg.broadcast,
            fromMe: msg.fromMe,
            hasQuotedMsg: msg.hasQuotedMsg,
            location: msg.location || null,
            vCards: msg.vCards || null,
            mentionedIds: msg.mentionedIds || null,
            isGif: msg.isGif,
            links: msg.links || null,
            rawData: {
                ack: msg.ack,
                deviceType: msg.deviceType,
                hasReaction: msg.hasReaction
            }
        });
        console.log(`Saved incoming message from ${senderName} to database`);
    } catch (error) {
        console.error('Failed to save incoming message:', error);
        // Continue processing even if save fails
    }

    // Skip empty messages
    if (!messageContent.trim()) {
        return;
    }

    // Use agent manager to handle the message
    try {
        const response = await agentManager.handleMessage(messageContent, senderNumber, senderName, isMessageToMe);

        if (response) {
            if (response === "noagentfound") {
                console.log(`No agent found for sender: ${senderName} (${senderNumber}). Not sending a response.`);
                return;
            }
            await msg.reply(response);
            console.log(`Response sent to ${senderName}`);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        // await msg.reply('Sorry, I encountered an error. Please try again later.');
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await agentManager.shutdown();
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await agentManager.shutdown();
    await client.destroy();
    process.exit(0);
});
