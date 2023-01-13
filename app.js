
require("dotenv").config()
var realm = require("./src/database/realm_app")

realm.then(async (db) => {

    db.write(() => {
        var result = db.objectForPrimaryKey("WhatsappStatus", 1)
       
        if (result == null) {
            var status = db.create("WhatsappStatus", {
                id: 1,
                "ready": "stating",
                "qrcode": "",
                "username":"",
                "phone":""
            })
        }else{
            result.ready = "starting"
            result.qrcode = ""
        }

    })

})

var whatsapp = require("./src/whatsapp/whatsapp_app")
var server = require("./src/server/server_app")


