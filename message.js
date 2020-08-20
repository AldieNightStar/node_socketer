function composeMessageObject(clientName, data) {
    let rnd = Math.floor(Math.random() * 9000) + 1000
    let code = `${clientName}_${rnd}_${Date.now()}`;
    return {
        "identifier": code,
        "data": data
    }
}

function composeAnswerObject(identifier, data) {
    return {identifier, data};
}

function readAnswerMessage(identifier, msg) {
    if (typeof(msg) !== "object") return null;
    if (msg.identifier !== identifier) return null;
    return msg.data;
}

module.exports = { composeMessageObject, readAnswerMessage, composeAnswerObject }