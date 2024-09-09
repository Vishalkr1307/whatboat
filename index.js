const { default: axios } = require("axios");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia,Location, Buttons, List } = require("whatsapp-web.js");

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on("qr", qr => {
    qrcode.generate(qr,{
        small: true
    })
});

client.on("ready", async () => {
    console.log("Client is ready");
    const chat= await client.getChats();
    const groupName="hello"
    const groupChat=chat.find(chat=> chat.isGroup && chat.name===groupName);
    if(groupChat){
        client.sendMessage(groupChat.id._serialized, "Roger N Reckon is ready to help you")
        console.log(`message sent to ${groupChat.name}`)
    }
    else{
        console.log(`group ${groupName} not found`)
    }
});

client.on("message", async msg => {
    const chart=await msg.getChat();
    const msgBody = msg.body.toLowerCase()
    if(msgBody === "hi" || msgBody === "hello"){
    msg.reply("welcome to Roger N Reckon, how can I help you?")
    }
    else if(msgBody === "how are you?"){
        msg.reply("I'm fine, thank you")
    }
    else if(msgBody === "what is your name?"){
        msg.reply("My name is Roger N Reckon")
    }
    else if(msgBody==="meme"){
        const media = await MessageMedia.fromUrl('https://i.imgflip.com/30b1gx.jpg')
        client.sendMessage(msg.from, media, {
            caption: "Roger N Reckon"
        })
    }

    else if(msgBody==="location"){
        const location=new Location(37.7749,-122.4194,'delhi')
        client.sendMessage(msg.from,location)
    }
    else if(msgBody==="button"){
        const buttons=new Buttons([{
            text:"Roger N Reckon",
            url:"https://www.google.com",
            body:"button 1"
        },{
            text:"Roger N Reckon",
            url:"https://www.google.com",
            body:"button 2"
        },{
            text:"Roger N Reckon",
            url:"https://www.google.com",
            body:"button 3"
        }])
        client.sendMessage(msg.from,buttons)


    }
    else if(msgBody==="list"){
        const sections=[{title:"section 1",rows:[{title:"option 1",description:"description 1"},{title:"option 2",description:"description 2"},{title:"option 3",description:"description 3"}]}]
        const list=new List("this is a list",'choose',sections,'Footer text')
        client.sendMessage(msg.from,list)

    }
    else if(msgBody==="group"){
        if(chart.isGroup){
            msg.reply("this is a group chart")
            const participants=await chart.participants.map(p=>p.id._serialized)
            if(chart.participants.includes(client.info.wid)){
                msg.reply(`you are in the group ${chart.name}`)
                await chart.addParticipants(['contact-id-to-add'])
                await chart.removeParticipants(['contact-id-to-remove'])
            }
        }
        else{
            msg.reply("this is not a group chart")
        }  
    }
    else if(!isNaN(msgBody)){
        try{
            const response=await axios.get(`https://api.agify.io/?name=${msgBody}`)
            if(response.data.error){
                msg.reply("Sorry, I couldn't find any information about that name.")
            }
            else{
                msg.reply(JSON.stringify(response.data))
            }

        }
        catch(error){
            msg.reply("Error fetching data .")
        }
        
    }

   

    

    
});
client.on("message_reaction",(reaction)=>{
    console.log(`Reaction received: ${reaction.emoji.text}`)
})

client.on("message_ack",(message)=>{
    console.log(`Message acknowledged: ${message.id}`)
})
client.on("group_join",async (notification)=>{
    const chat=await notification.getChat()
    if(chat.isGroup){
        const groupName=chat.name
        const groupChat=await client.getChatById(chat.id._serialized)
        if(groupChat){
            client.sendMessage(groupChat.id._serialized,`Welcome to ${groupName}`)
            console.log(`welcome message sent to ${groupName}`)
        }
        else{
            console.log(`group ${groupName} not found`)
        }
    }
})

client.on("group_leave",async (notification)=>{
    const chat=await notification.getChat()
    if(chat.isGroup){
        const groupName=chat.name
        const groupChat=await client.getChatById(chat.id._serialized)
        if(groupChat){
            client.sendMessage(groupChat.id._serialized,`Goodbye ${groupName}`)
            console.log(`goodbye message sent to ${groupName}`)
        }
        else{
            console.log(`group ${groupName} not found`)
        }
    }
})

client.initialize();
