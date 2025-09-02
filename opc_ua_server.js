/*
 * =================================================================================
 * OPC UA SERVER SIMULATOR
 * =================================================================================
 *
 *
 * Description:
 * This Node.js application creates a lightweight OPC UA server to simulate an
 * industrial device or process. It generates 10 sample tags with fluctuating
 * numerical values. The server is configured to run on a non-default port
 * and allows client sessions to remain inactive for up to 1 minute before
 * timing out. This script is designed to be the backend for the data logger client.
 *
 */

// --- PART 1: IMPORTS ---
// We import the necessary classes from the 'node-opcua' library to build our server.
const { OPCUAServer, Variant, DataType } = require("node-opcua");


// --- PART 2: MAIN SERVER FUNCTION ---
// The entire server logic is wrapped in an "Immediately Invoked Function Expression" (IIFE).
// The `async` keyword allows us to use `await` for asynchronous operations, which makes
// the code cleaner and easier to read than using traditional callbacks.
(async () => {
  // A `try...catch` block surrounds our main logic to gracefully handle any
  // potential errors during the server's startup sequence.
  try {
    // 2.1: Create the Server Instance
    // We create a new OPCUAServer object and pass a configuration object to it.
    const server = new OPCUAServer({
      // The network port the server will listen on. 4840 is the default, but we use
      // 4841 to avoid potential conflicts.
      port: 4841,
      // A unique path for the server's endpoint URL.
      resourcePath: "/my/new/server/",
      // **Crucial Setting**: This defines the maximum time (in milliseconds) a client
      // session can be idle before the server automatically closes it. We set it to
      // 60,000 ms (1 minute) to work reliably with our client's keep-alive pings.
      maxInactiveSessionLifetime: 60 * 1000,

      // 'buildInfo' provides metadata about the server that clients can read.
      buildInfo: {
        productName: "MyFinalNodeOPCUAServer",
        buildNumber: "5",
        buildDate: new Date(),
      },
    });

    // 2.2: Initialize the Server
    // This asynchronous step sets up all the internal server components.
    await server.initialize();

    // 2.3: Get the Address Space
    // The 'addressSpace' is like the server's internal filing system where all data
    // points (nodes) are organized.
    const addressSpace = server.engine.addressSpace;
    // We get our own 'namespace' to add our custom tags, separating them from the
    // standard OPC UA nodes.
    const namespace = addressSpace.getOwnNamespace();

    // 2.4: Create a Folder for Our Tags
    // We create a virtual "Folder" object within the server's address space.
    // This helps organize our tags neatly under a single parent object.
    const myDevice = namespace.addObject({
      organizedBy: addressSpace.rootFolder.objects,
      browseName: "MySimulationTags",
    });

    // 2.5: Create the 10 Dummy Tags
    // We loop 10 times to programmatically create our simulated sensor tags.
    for (let i = 1; i <= 10; i++) {
      let initialValue = i * 10.0;
      // For each iteration, we add a new "Variable" node to our folder.
      namespace.addVariable({
        // This links the variable to the 'MySimulationTags' folder we created.
        componentOf: myDevice,
        // The human-readable name that clients will see when browsing.
        browseName: `Tag${i}`,
        // The unique machine-readable ID for this tag within our namespace.
        nodeId: `s=Tag${i}`,
        // Defines the type of data this variable holds (in this case, a floating-point number).
        dataType: DataType.Double,

        // **Dynamic Value Simulation**: Instead of a static value, we provide a 'get'
        // function. This function is executed *every time* a client reads the tag.
        value: {
          get: () => new Variant({
            dataType: DataType.Double,
            // We return the tag's base value plus a small, random number.
            // This simulates the minor fluctuations of a real-world sensor reading.
            value: initialValue + (Math.random() * 5 - 2.5)
          }),
        },
      });
    }

    // 2.6: Start the Server
    // This command starts the server, making it begin listening for client connections.
    await server.start();
    console.log("✅ Final OPC UA Server is now running.");
    console.log("Endpoint URL:", server.getEndpointUrl());
    console.log("Press (Ctrl+C) to stop the server.");

    // 2.7: Graceful Shutdown Logic
    // This sets up a listener for the "SIGINT" event, which is triggered when
    // you press Ctrl+C in the terminal.
    process.on("SIGINT", async () => {
      console.log("\nShutting down server...");
      // This command properly closes all client sessions and stops the server.
      await server.shutdown();
      console.log("Server stopped.");
      process.exit(0); // Exit the application cleanly.
    });

  } catch (err) {
    // If any error occurs during the `try` block, this `catch` block will execute.
    console.error("❌ An error occurred while starting the server:", err.message);
    process.exit(1); // Exit with a non-zero code to signify an error.
  }
})();
