const { Client, Location, Poll, List, Buttons, LocalAuth } = require('./index');

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
    senderName = msg._data.notifyName || msg._data.sender.pushname || msg._data.sender.verifiedName || 'Unknown';
    messageContent = msg.body || '';
    messageTo = msg.to;
    isMessageToMe = messageTo === "6597772291@c.us" ? true : false;
    console.log(`Message from: ${senderName}`, `| To me: ${isMessageToMe}`, `| Content: ${messageContent}`);

    if (senderName.toLowerCase() === 'bababoi maxx') {
        // Send a new message to the same chat
        // client.sendMessage(msg.from, 'pong');
        msg.reply('Hi there');
    } else if (senderName.toLowerCase() === 'angela febby') {
        // Send a new message to the same chat
        // client.sendMessage(msg.from, 'pong');
        msg.reply('Hi there');
    }
});
