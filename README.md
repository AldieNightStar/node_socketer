# node_socketer (`wsocketer`)

# Install
```
npm install AldieNightstar/node_socketer
```

# Usage
```js
// Import
const wsocketer = require("wsocketer");

// Create new server
let server = wsocketer.newServer(8000, "MyPassword");
// server ==> WebSocket server

async function main() {
	// Create new client
	let client = await wsocketer.newClient("ws://localhost:8000", "MyPassword", "MyName", {
		onConnect: () => console.log("Connected!"),
		onDisconnect: () => console.log("Disconnected!"),
		onMessage: (sender, message) => {
			console.log(`NEW MESSAGE FROM ${sender}: ${message}`)
			// Send answer
			return "Thank you!";
		}
	})

	// Send message to another client
	client.send("OtherName", "PING");

	// Send message to another client and WAIT for response
	// Throws error if message not sent or such client is not connected
	let response = await client.sendAwait("OtherName", "PING");

	// Return list of all clients connected to this server as well
	// You is not displayed in this list.
	let clients  = await client.getOthers()
}

main();

```
