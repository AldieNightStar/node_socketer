const WebSocket = require("ws");
const { addSendAwait } = require("ws-send-await");

function newClient(url, password, name, options) {
	return new Promise((resolve, reject) => {
		let ws = new WebSocket(url);
		let state = 0;
		addSendAwait(ws);
		let client = _client(name, ws, options);
		ws.on('open', async () => {
			if (state === 0) {
				let resp = await ws.sendAwait(password);
				if (resp !== "AUTH OK") {
					reject(new Error("Wrong password!"));
					return;
				}
				resp = await ws.sendAwait(name);
				if (resp !== "NAME OK") {
					reject(new Error("Wrong name: " + resp));
					return;
				}
				state = 1;
				if (options.onConnect) {
					options.onConnect(client);
				}
				resolve(client);
			}
		});
		ws.on('close', () => {
			if (options.onDisconnect) {
				options.onDisconnect();
			}
		});
		ws.on('message', async msg => {
			if (state === 1) {
				if (msg === "ERR_NOCLIENT") return;
				let arr = splitWithTail(msg, " ", 1);
				if (options.onMessage) {
					// arr[0] - sender
					// arr[1] - message
					let message = parseResponse(arr[1]);
					let answ = await options.onMessage(arr[0], message);
					answ = stringify(answ);
					if (answ) {
						ws.send(`SEND ${arr[0]} ${answ}`);
					}
				}
			}
		});
	});
}

function _client(name, ws, options) {
	let closed = false;
	function composeMsg(name, msg) {
		return "SEND " + name + " " + msg;
	}
	async function sendAwait(name, text) {
		if (closed) return;
		text = stringify(text);
		let resp = await awaitOrTimeout(
			ws.sendAwait(composeMsg(name, text)),
			3000
		);
		if (resp === null) {
			throw new Error("Response time out!");
		}
		if (resp === "ERR_NOCLIENT") {
			throw new Error("No such client with name: " + name);
		}
		let arr = splitWithTail(resp, " ", 1);
		return parseResponse(arr[1]);
	}
	async function send(name, text) {
		if (closed) return;
		text = stringify(text);
		ws.send(composeMsg(name, text));
	}
	async function disconnect() {
		if (closed) return;
		closed = true;
		ws.close();
	}
	async function getOthers() {
		let resp = await ws.sendAwait("NAMES");
		if (resp === undefined || resp === null) return [];
		if (typeof (resp) !== "string") return "";
		let array = null;

		// If element only one
		if (resp.indexOf(",") === -1) {
			array = [resp];
		} else { // If many elements
			array = resp.split(", ");
		}

		let myid = array.indexOf(name);
		if (myid !== -1) {
			array.splice(myid, 1);
		}

		return array;
	}

	return { sendAwait, send, disconnect, options, getOthers };
}


function splitWithTail(str, delim, count) {
	var parts = str.split(delim);
	var tail = parts.slice(count).join(delim);
	var result = parts.slice(0, count);
	result.push(tail);
	return result;
}

function awaitOrTimeout(promise, ms) {
	let timer = new Promise(ok => setTimeout(() => ok(null), ms));
	return Promise.race([promise, timer]);
}

function stringify(text) {
	if (typeof (text) === "string") return text;
	if (typeof (text) in ["number", "boolean"]) return "" + text;
	if (typeof (text) === "function") throw new Error("Can't stringify function");
	if (typeof (text) === "object") return JSON.stringify(text);
	throw new Error("Unknown type")
}

function parseResponse(text) {
	if (!text) return text;
	if (text.startsWith("[") || text.startsWith("{") || text.startsWith("\"")) {
		try {
			return JSON.parse(text);
		} catch (e) {
			return text;
		}
	}
	return text;
}

module.exports = { newClient }
