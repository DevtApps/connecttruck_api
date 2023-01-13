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
        message += "Olá, você está próximo a um de nossos parceiros, faça uma visita a " + partner.nome + "!\n\n";

        if(partner.telefone != null)message += "Telefone: "+ partner.telefone+"\n"
        if(partner.endereco != null)message += "Endereço: "+partner.endereco+"\n"

        message += "\nEquipe Rotas ConnectTruck"

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
        return res.redirect("/dashboard")
        else next()
    } catch (e) {
        
        next()
    }
}

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