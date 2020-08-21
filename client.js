const WebSocket = require("ws");
const { addSendAwait } = require("ws-send-await");
const { composeMessageObject, readAnswerMessage, composeAnswerObject } = require("./message");

function newClient(url, password, name, options) {
	return new Promise((resolve, reject) => {
		let ws = new WebSocket(url);
		let state = 0;
		let messageReceivers = [];
		addSendAwait(ws);
		let client = _client(name, ws, options, messageReceivers);
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
				let [sender, message] = splitWithTail(msg, " ", 1);
				message = JSON.parse(message);

				// Check each function in messageReceivers. If some function will return true, then we will remove it from array
				//   and stop the iteration
				// Each message should have message.identifier filter. And if filter is right, then this message returns true and we remove it.
				let newMessage = true;
				for (let i = 0; i < messageReceivers.length; i++) {
					let func = messageReceivers[i];
					if (func(message)) {
						let funcId = messageReceivers.indexOf(func);
						messageReceivers.splice(funcId, 1);
						newMessage = false;
						break;
					}
				}

				// If no-one message returned true, then we said that this message is new for client.
				// We consider it as new message
				if (options.onMessage && newMessage) {
					let answ = await options.onMessage(sender, message.data);
					if (answ !== undefined) {
						answ = composeAnswerObject(message.identifier, answ);
						let answText = JSON.stringify(answ);
						ws.send(`SEND ${sender} ${answText}`);
					} else {
						answ = composeAnswerObject(message.identifier, "ERR_NODATA");
						let asnwText = JSON.stringify(answ);
						ws.send(`SEND ${sender} ${asnwText}`);
					}
				}
			}
		});
	});
}

function _client(name, ws, options, messageReceivers) {
	let closed = false;
	function formatMsg(name, msg) {
		return "SEND " + name + " " + msg;
	}
	async function send(name, messageData) {
		if (closed) return;
		let msgObject = composeMessageObject(name, messageData);

		// Put new CallBack to messageReceivePromise which will resolve promise to await for message with the same identifier
		let messageReceivePromise = new Promise(ok => {
			let func = incomeMessage => {
				try {
					let data = readAnswerMessage(msgObject.identifier, incomeMessage)
					if (data !== null && data !== undefined) {
						ok(data);
						return true;
					}
					return false;
				} catch (e) {
					console.error(e);
					return false;
				}
			};
			messageReceivers.push(func);

			// Remove this function from array if no response for so long
			setTimeout(() => {
				let funcId = messageReceivers.indexOf(func);
				if (funcId !== -1) {
					messageReceivers.splice(funcId, 1);
				}
			}, 10000);
		})

		ws.send(formatMsg(name, JSON.stringify(msgObject)));

		let resp = await awaitOrTimeout(messageReceivePromise, 9000);
		if (resp === null) throw new Error("Response time out!");
		if (resp === "ERR_NOCLIENT") throw new Error(`Client with name "${name}" is not connected for now!`);
		if (resp === "ERR_NODATA") return null;

		return resp;
	}
	async function disconnect() {
		if (closed) return;
		closed = true;
		ws.close();
	}
	async function getOthers() {
		let resp = await send("SERVER", "NAMES");
		if (resp === undefined || resp === null) throw Error("Can't retreive list of clients.");
		if (!Array.isArray(resp)) throw Error("Error with retreiving list of clients: " + resp);
		{ // Remove myself from this list
			let myid = resp.indexOf(name);
			if (myid !== -1) {
				resp.splice(myid, 1);
			}
		}
		return resp;
	}

	return { send, disconnect, options, getOthers };
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

module.exports = { newClient }
