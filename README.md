# node_socketer (`wsocketer`)

# Install
```
npm install AldieNightstar/node_socketer
```

# Usage
```js
const wsocketer = require("wsocketer");

// Create new server
let server = wsocketer.newServer(8000, "MyPassword");
// server is WebSocket server


// Create new client
let client = wsocketer.newClient("ws://localhost:8000", "MyPassword", "MyName", {
	onConnect: () => console.log("Connected!"),
	onDisconnect: () => console.log("Disconnected!"),
	onMessage: (sender, message) => {
		console.log(`NEW MESSAGE FROM ${sender}: ${message}`)
		// Send answer
		return "Thank you!";
	}
});
client.send("OtherName", "PING");
let response = await client.sendAwait("OtherName", "PING");
```
