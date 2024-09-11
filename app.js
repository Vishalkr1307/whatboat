const { default: axios } = require("axios");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia, Location, Buttons, List } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, 'config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error("Failed to read or parse config.json:", error);
    process.exit(1); // Exit if config loading fails
}

const apiCache = new Map();
let qrGenerated=false

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on("qr", qr => {
    if(!qrGenerated){
        qrcode.generate(qr, { small: true });
        qrGenerated=true
        console.log("QR Code generated. Scan it to log in.")

    }
    else{
        console.log("Already have a QR code, please scan it to log in.")
    }
});

client.on("ready", async () => {
    console.log("Client is ready");

    try {
        const chats = await client.getChats();
        console.log("Chats:", chats);
        const groupChat = chats.find(chat => chat.isGroup && chat.name === config.group_name);

        if (groupChat) {
            await client.sendMessage(groupChat.id._serialized, `${config.bot_name} is ready to help you.`);
            console.log(`Message sent to group: ${config.group_name}`);
        } else {
            console.log(`Group ${config.group_name} not found`);
        }
    } catch (error) {
        console.error("Error during group lookup or message sending:", error.message || error);
    }
});

client.on("message", async msg => {
    try {
        console.log("Received message:", msg.body); 
        const msgBody = msg.body.toLowerCase();
        const chat = await msg.getChat();

        if (config.commands[msgBody]) {
            await msg.reply(config.commands[msgBody]);
        } else if (msgBody === "meme") {
            try {
                const media = await MessageMedia.fromUrl("https://i.imgflip.com/30b1gx.jpg");
                await client.sendMessage(msg.from, media, { caption: config.bot_name });
            } catch (error) {
                console.error("Failed to send meme:", error.message || error);
                await msg.reply("Sorry, I couldn't fetch the meme.");
            }
        } else if (msgBody === "location") {
            try {
                const location = new Location(37.7749, -122.4194, "San Francisco");
                await client.sendMessage(msg.from, location);
            } catch (error) {
                console.error("Error sending location:", error.message || error);
                await msg.reply("Sorry, I couldn't send the location.");
            }
        } else if (msgBody === "button") {
            const buttons = [
                { text: "Google", url: "https://www.google.com" },
                { text: "Bing", url: "https://www.bing.com" }
            ];

            const buttonMessage = new Buttons(buttons, "Choose a search engine", "Search Engines", "Powered by Roger N Reckon");

            try {
                await client.sendMessage(msg.from, buttonMessage);
            } catch (error) {
                console.error("Error sending button message:", error.message || error);
                await msg.reply("Sorry, I couldn't send the button options.");
            }
        } else if (msgBody === "list") {
            const sections = [
                {
                    title: "Options",
                    rows: [
                        { title: "Option 1", description: "Description 1" },
                        { title: "Option 2", description: "Description 2" },
                        { title: "Option 3", description: "Description 3" }
                    ]
                }
            ];
            const list = new List("This is a list", "Select an option", sections, "Footer text");

            try {
                await client.sendMessage(msg.from, list);
            } catch (error) {
                console.error("Error sending list message:", error.message || error);
                await msg.reply("Sorry, I couldn't send the list options.");
            }
        } else if (msgBody === "group" && chat.isGroup) {
            await msg.reply(`You are in the group: ${chat.name}`);
        } else if (!isNaN(msgBody)) {
            if (apiCache.has(msgBody)) {
                await msg.reply(JSON.stringify(apiCache.get(msgBody)));
            } else {
                try {
                    const response = await axios.get(`https://api.agify.io/?name=${msgBody}`);
                    if (response.data.error) {
                        await msg.reply(config.api_error_message);
                    } else {
                        await msg.reply(JSON.stringify(response.data));
                        apiCache.set(msgBody, response.data);
                        setTimeout(() => apiCache.delete(msgBody), config.api_cache_time * 1000);
                    }
                } catch (error) {
                    if (error.response) {
                        // Server responded with a status code outside the range of 2xx
                        console.error("API server error:", error.response.data);
                        await msg.reply("Sorry, the API service returned an error.");
                    } else if (error.request) {
                        // No response received
                        console.error("No response received from API:", error.request);
                        await msg.reply("Sorry, I couldn't reach the API service.");
                    } else {
                        // Other errors
                        console.error("API request error:", error.message || error);
                        await msg.reply("An error occurred while processing your request.");
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error handling message:", error.message || error);
        await msg.reply("Sorry, something went wrong while processing your message.");
    }
});

client.on("group_join", async notification => {
    try {
        const chat = await notification.getChat();
        if (chat.isGroup) {
            await client.sendMessage(chat.id._serialized, config.welcome_message);
            console.log(`Welcome message sent to ${chat.name}`);
        }
    } catch (error) {
        console.error("Error handling group join:", error.message || error);
    }
});

client.on("group_leave", async notification => {
    try {
        const chat = await notification.getChat();
        if (chat.isGroup) {
            await client.sendMessage(chat.id._serialized, config.goodbye_message);
            console.log(`Goodbye message sent to ${chat.name}`);
        }
    } catch (error) {
        console.error("Error handling group leave:", error.message || error);
    }
});

client.initialize();
