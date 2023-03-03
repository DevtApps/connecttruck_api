var express = require('express');

var qrcode = require("qrcode");
const client = require("./../whatsapp/whatsapp_app");
const realm = require('../database/realm_app');
var bodyParser = require('body-parser')
const fs = require("fs")

var app = express();
var PORT = 3000;

const https = require('https');

var options = {
    key: fs.readFileSync('ssl.key'),
    cert: fs.readFileSync('ssl.cert')
  };

const server = https.createServer(options, app)

const event_manager = require('../events/event_manager');
var cookieParser = require('cookie-parser')

const { createJWT, verifyToken } = require('../secutity/auth');
const io = require("socket.io")(server);

// parse application/x-www-form-urlencoded

app.use(bodyParser.urlencoded({ extended: false, limit: "10mb" }))
app.use(cookieParser())
// parse application/json
app.use(bodyParser.json({ limit: "10mb" }))


io.on("connection", (socket) => {
    try {
        var key = socket.handshake.auth.key

        if (key != process.env.API_KEY) return socket.disconnect()
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
    } catch (e) {
        socket.disconnect()
    }
})

io.listen(8443)

// View engine setup
app.set('view engine', 'ejs');

//With middleware
app.use('/dashboard', async function (req, res, next) {
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


app.get('/dashboard', async function (req, res) {

    res.render('index')

});


app.post('/message/partner', function (req, res) {
    try {
        var apikey = req.headers['x-api-key']

        if (apikey == process.env.API_KEY) {
            var { partner, number } = req.body

            var message = "";
            message += "Visite nosso parceiro " + partner.nome + "!\n\nSaiba mais no link abaixo:\n\nhttps://connecttruck.page.link/parceiros";

            var data = {
                number: number,
                message: message,
                image: partner.imagem
            }
            event_manager.emit("send image", data)
            res.send()
        }
        else res.status(402).send({ message: "Usuário não autenticado" });
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
});
app.post('/message/user', function (req, res) {
    try {
        var apikey = req.headers['x-api-key']

        if (apikey == process.env.API_KEY) {
            var { message, number } = req.body

            var data = {
                number: number,
                message: message
            }
            event_manager.emit("send message", data)
            res.send()
        }
        else res.status(402).send({ message: "Usuário não autenticado" });
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
});

function onLogged(req, res, next) {
    try {

        var cookie = req.cookies
        if (cookie.token != null && verifyToken(cookie.token) != null)
            return res.redirect("/dashboard")
        else next()
    } catch (e) {

        next()
    }
}

app.get('/', onLogged, async function (req, res) {
    res.render("login", { sucess: true })
});

app.post('/login', async function (req, res) {
    try {
        var { email, password } = req.body;

        email = email.toString().replace("'", "").replace("*", "").replace(",", "");

        password = password.toString().replace("'", "").replace("*", "").replace(",", "");

        if (email == process.env.EMAIL && password == process.env.PASSWORD) {
            res.clearCookie("token")
            res.cookie("token", createJWT()).redirect("/dashboard")
        } else {
            res.render("login", { sucess: false })
        }
    } catch (e) {
        res.status(400).send()
    }
});

app.listen(PORT, "0.0.0.0", function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
});

module.exports = { server, io };

