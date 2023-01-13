class WhatsappStatusModel extends Realm.Object{
    static schema = {
        name: "WhatsappStatus",
        properties: {
          id:"int",
          ready: "string",
          qrcode: "string",
          username:"string",
          phone:"string"
        },
        primaryKey: "id",
      };
}

module.exports = WhatsappStatusModel