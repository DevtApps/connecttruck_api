
var Realm = require("realm")
var WhatsappStatusModel = require("./models/whatsapp_status")
var realm = Realm.open({
    path:"./realm",
    schema:[
        WhatsappStatusModel
    ]
})

module.exports = realm;

