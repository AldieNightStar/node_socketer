// Constants
const STATE_GUEST = 0;
const STATE_NAMING = 1;
const STATE_ROOM_MEMBER = 2;

const ERR_NOCLIENT = "ERR_NOCLIENT";
// ---

const WebSocket = require("ws");
const { newClient } = require("./client");
const { composeMessageObject, readAnswerMessage, composeAnswerObject } = require("./message");

function newServer(port, password) {
	const wss = new WebSocket.Server({ port });
	let conns = {};

	wss.on('connection', (ws) => {
		let state = STATE_GUEST;
		let name = null;

		ws.on('message', msg => {
			if (state === STATE_GUEST) {
				if (msg === password) {
					ws.send("AUTH OK");
					state = STATE_NAMING;
				} else {
					ws.send("AUTH ERR");
				}
			} else if (state === STATE_NAMING) {
				if (name_valid(msg)) {
					name = msg;
					if (conns[name] === undefined) {
						ws.send("NAME OK");
						state = STATE_ROOM_MEMBER;
						conns[name] = ws;
					} else {
						ws.send("NAME BUSY");
					}
				} else {
					ws.send("NAME ERR");
				}
			} else if (state === STATE_ROOM_MEMBER) {
				let [cmd, content] = cmd_parse(msg);
				if (cmd === "SEND") {
					let [receiverName, messageTextBody] = cmd_parse(content);

					// SERVER COMMAND
					// ==============
					if (receiverName === "SERVER") {
						const msgObject = JSON.parse(messageTextBody);
						callServerCommand(ws, name, msgObject, conns);
						return;
					}

					// COMMAND TO ANOTHER CLIENT
					// =========================
					let messageToSend = `${name} ${messageTextBody}`;
					let err = send_to_one(conns, receiverName, messageToSend);
					if (err !== undefined) {
						const msgObject = JSON.parse(messageTextBody);
						const errorAnswer = composeAnswerObject(msgObject.identifier, err);
						ws.send("SERVER " + JSON.stringify(errorAnswer));
					}
				}
			}
		});
		ws.on('close', () => {
			if (conns[name]) {
				delete conns[name];
			}
		});
	});

	return wss;
}

// NAME
// -------
function name_valid(name) {
	return name.length > 2 && name.length <= 20 && !name.includes(" ");
}

// Messaging
// ---------
function send_to_one(conns, name, message) {
	let w = conns[name];
	if (!w) return ERR_NOCLIENT;
	w.send(message);
}

// Commands
// ---------
function cmd_parse(line) {
	if (line.includes(" ")) {
		return splitWithTail(line, " ", 1);
	} else {
		return [line, ""];
	}
}


// String Utils
// ------------
function splitWithTail(str, delim, count) {
	var parts = str.split(delim);
	var tail = parts.slice(count).join(delim);
	var result = parts.slice(0, count);
	result.push(tail);
	return result;
}

// Server commands
function callServerCommand(ws, clientName, msgObject, conns) {
	// msgObject - {identifier, data}

	// Check commands by msgObject.data
	if (msgObject.data === "NAMES") {
		const answ = composeAnswerObject(
			msgObject.identifier,
			Object.keys(conns)
		)
		ws.send("SERVER " + JSON.stringify(answ));
	} else {
		const answ = composeAnswerObject(
			msgObject.identifier,
			"ERR_UNKNOWN_CMD"
		)
		ws.send("SERVER " + JSON.stringify(answ));
	}
}

// Export
// -------
module.exports = { newServer, newClient };

