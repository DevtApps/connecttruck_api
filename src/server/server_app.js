var express = require('express');

var qrcode = require("qrcode");
const client = require("./../whatsapp/whatsapp_app");
const realm = require('../database/realm_app');

var server = express();
var PORT = 3000;

const http = require('http');
const ioserver = http.createServer(server);
var bodyParser = require('body-parser')

const { Server } = require("socket.io");

const { Client } = require('whatsapp-web.js');
const event_manager = require('../events/event_manager');
var cookieParser = require('cookie-parser')
const { StringDecoder } = require('string_decoder');
const { createJWT, verifyToken } = require('../secutity/auth');
const io = new Server(ioserver, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    }
});
// parse application/x-www-form-urlencoded
server.use(bodyParser.urlencoded({ extended: false }))
server.use(cookieParser())
// parse application/json
server.use(bodyParser.json())


io.on("connection", (socket) => {
    socket.on("status", async (data) => {
        var db = await realm
        var status = db.objectForPrimaryKey("WhatsappStatus", 1);
        var result;
        if (status.ready == "not_ready")
            result = await qrcode.toDataURL(status.qrcode)

        socket.emit("status", { ready: status.ready, qrcode: result, username: status.username })

    })
    socket.on("logout", async (data) => {
        event_manager.emit("logout")
    })
})

io.listen(4000)

// View engine setup
server.set('view engine', 'ejs');

//With middleware
server.use('/dashboard', async function (req, res, next) {
    try {
        var cookie = req.cookies
      
        if (verifyToken(cookie.token) == null) return res.status(402).redirect("/")
        else next()
    } catch (e) {
        console.log(e)
        return res.status(402).redirect("/")
    }
}
);


server.get('/dashboard', async function (req, res) {

    res.render('index')

});


server.post('/message/partner', function (req, res) {
    try{
    var apikey = req.headers['x-api-key']
   
    if (apikey == process.env.API_KEY) {
        var { partner, number } = req.body

        var message = "";
        message += "Visite nosso parceiro " + partner.nome + "!\n\nSaiba mais no link abaixo:\n\n";

        var data = {
            number: number,
            message:message,
            image:partner.imagem
        }
        event_manager.emit("send image", data)
        res.send()
    }
    else res.status(402).send({ message: "Usuário não autenticado" });
    }catch(e){
        console.log(e)
        res.status(500).send()
    }
});
server.post('/message/user', function (req, res) {
    try{
    var apikey = req.headers['x-api-key']
   
    if (apikey == process.env.API_KEY) {
        var { message, number } = req.body

        var data = {
            number: number,
            message:message
        }
        event_manager.emit("send message", data)
        res.send()
    }
    else res.status(402).send({ message: "Usuário não autenticado" });
    }catch(e){
        console.log(e)
        res.status(500).send()
    }
});

function onLogged(req, res, next){
    try {
        
        var cookie = req.cookies
        if ( cookie.token != null && verifyToken(cookie.token) != null)
        if(req.path == "/login" || req.path == "/") return  res.redirect("/dashboard")
        else next()
    } catch (e) {
        
        next()
    }
}

var imagem = "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"
server.get('/teste',onLogged, async function (req, res) {
    var data = {
        number: "19998143982",
        image:imagem
    }
    event_manager.emit("send teste", data)
    res.send({ sucess: true })
});
server.get('/',onLogged, async function (req, res) {
    res.render("login", { sucess: true })
});

server.post('/login', async function (req, res) {
    try{
    var { email, password } = req.body;
   
    email = email.toString().replace("'", "").replace("*", "").replace(",", "");

    password = password.toString().replace("'", "").replace("*", "").replace(",", "");

    if (email == process.env.EMAIL && password == process.env.PASSWORD) {
        res.clearCookie("token")
        res.cookie("token", createJWT()).redirect("/dashboard")
    } else {
        res.render("login", { sucess: false })
    }
}catch(e){
    res.status(400).send()
}
});

server.listen(PORT,"0.0.0.0", function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
});

module.exports = { server, io };

