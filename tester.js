const WebSocket = require("ws");
const input = require("input");

const URL = "ws://localhost:8080";

async function main() {
	let connected = true;
	let ws = new WebSocket(URL);
	ws.on('message', console.log);
	ws.on('open', () => console.log("Connected!"));
	ws.on('close', () => {
		console.log("Disconnected!")
		connected = false;
	});
	while (connected) {
		let line = await input("> ");
		ws.send(line);
	}
}

main();
// main2();
