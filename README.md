# NodeJS WS - Node Socketer

# Install
```
npm install AldieNightstar/node_socketer
```

# Create Server
```js
// Import
const wsocketer = require("wsocketer");

let server = wsocketer.newServer(8000, "MyPassword");
```



# Create Client
```js
// Here we creating Client
// Can throw Error in case wrong name or password
let client = await wsocketer.newClient("ws://localhost:8000", "MyPassword", "MyName", {
    onConnect: (client) => console.log("Connected!"),
    onDisconnect: () => console.log("Disconnected!"),
    onMessage: (sender, message) => {
        // sender  - Name of the sender client
        // message - Message text/object

        // Send message via return statement
        return {"text": "Thank you!"};
    }
});
```
```js
// Send message to `Service1` client and wait for response
// response can be either text or object. Depends on response from client
const response = await client.send("Service1", {"a": 123, "b": 456});

// Get list of other client names
const list = await client.getOthers();
```