const WebSocket = require("ws");
const { addSendAwait } = require("ws-send-await");

function newClient(url, password, name, options) {
	return new Promise((resolve, reject) => {
		let ws = new WebSocket(url);
		let state = 0;
		addSendAwait(ws);
		let client = _client(ws, options);
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
				let arr = splitWithTail(msg, " ", 1);
				if (options.onMessage) {
					// arr[0] - sender
					// arr[1] - message
					let answ = await options.onMessage(arr[0], arr[1]);
					if (answ) {
						ws.send(`SEND ${arr[0]} ${answ}`);
					}
				}
			}
		});
	});
}

function _client(ws, options) {
	let closed = false;
	function composeMsg(name, msg) {
		return "SEND " + name + " " + msg;
	}
	async function sendAwait(name, text) {
		if (closed) return;
		let resp = await ws.sendAwait(composeMsg(name, text));
		let arr = splitWithTail(resp, " ", 1);
		return arr[1];
	}
	async function send(name, text) {
		if (closed) return;
		ws.send(composeMsg(name, text));
	}
	async function disconnect() {
		if (closed) return;
		closed = true;
		ws.close();
	}
	return { sendAwait, send, disconnect, options };
}


function splitWithTail(str, delim, count){
  var parts = str.split(delim);
  var tail = parts.slice(count).join(delim);
  var result = parts.slice(0,count);
  result.push(tail);
  return result;
}

module.exports = { newClient }
