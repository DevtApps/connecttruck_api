var jwt = require("jsonwebtoken")
exports.createJWT =()=>{
    return jwt.sign({timestamp: Date.now(), version:"1"},process.env.SECRET_JWT,{
        expiresIn:Date.now()+60*60*1000
    })
}

exports.verifyToken = (token)=>{
    return jwt.verify(token, process.env.SECRET_JWT)
}