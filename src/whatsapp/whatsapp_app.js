
const { Client, LocalAuth } = require('whatsapp-web.js');
const realm = require('../database/realm_app');
var qrcode = require("qrcode")
var os = require("child_process")

var eventManager = require("./../events/event_manager")

var { io } = require("../server/server_app");

const client = new Client({
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
        ]
    },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    authStrategy: new LocalAuth(
        {
            clientId: "api"
        }
    )
});




client.on('qr', async (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);


    var db = await realm
    db.write(async () => {
        var status = db.objectForPrimaryKey("WhatsappStatus", 1)
        status.ready = "not_ready";
        status.qrcode = qr
        var result = await qrcode.toDataURL(status.qrcode)
        io.emit("status", { ready: status.ready, qrcode: result })

    })
});

client.on('ready', async () => {
    console.log('Client is ready!');
    console.log(client.info)
    var db = await realm
    db.write(async () => {

        var status = db.objectForPrimaryKey("WhatsappStatus", 1)
        status.ready = "ready";
        status.qrcode = ""
        status.username = client.info.pushname
        io.emit("status", status)
    })
});


client.on('message', async msg => {
    console.log(msg.from)
    if (msg.body == '!ping') {
        msg.reply('pong');
       
        console.log(id)
        var result = await client.sendMessage(msg.from, "Hello, if your receive this message, sorry! delete this. It´s a software test")
        console.log(result)
    }
});

client.initialize();
eventManager.on("logout", async () => {

    await client.logout()
    await client.destroy()
   
    setTimeout(() => {
        os.exec("pm2 restart app.js", (e)=>{
            setTimeout(() => {
                os.exec("pm2 restart app.js")
            }, 5000);
           
        })
    }, 1000);
   
    
    
})
eventManager.on("send message", async (data) => {
  var user = await client.getNumberId(data.number)
  if(user != null)
  client.sendMessage(user._serialized, data.message)
})

module.exports = client;