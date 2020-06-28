// Constants
const STATE_GUEST = 0;
const STATE_NAMING = 1;
const STATE_ROOM_MEMBER = 2;
// ---

const WebSocket = require("ws");
const { newClient } = require("./client");

function newServer(port, password) {
	const wss = new WebSocket.Server({port});

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
				let cmd = cmd_parse(msg);
				if (cmd[0] === "NAMES") {
					ws.send(Object.keys(conns).join(", "));
				} else if (cmd[0] === "SEND") {
					let arr = cmd_parse(cmd[1]);
					let message = name + " " + arr[1];
					send_to_one(conns, arr[0], message);
				} else if (cmd[0] === "ECHO") {
					ws.send(msg);
				} else if (cmd[0] === "MYNAME") {
					ws.send(name);
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
	if (!w) return;
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
function splitWithTail(str, delim, count){
  var parts = str.split(delim);
  var tail = parts.slice(count).join(delim);
  var result = parts.slice(0,count);
  result.push(tail);
  return result;
}

// Export
// -------
module.exports = { newServer, newClient };

