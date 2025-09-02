/*
 * =================================================================================
 * OPC UA DATA LOGGER CLIENT
 * =================================================================================
 *
 *
 * Description:
 * This Node.js application connects to an OPC UA server, reads a predefined
 * list of 10 tags every 1 minute, and logs the data to **hourly** CSV files.
 * It uses a dual-timer architecture to ensure the connection remains stable
 * by sending a lightweight "keep-alive" ping every 15 seconds, preventing
 * session timeouts.
 *
 */

// --- PART 1: IMPORTS ---
// Import necessary classes and functions from the required libraries.
// 'node-opcua' is for all OPC UA communication.
const { OPCUAClient, AttributeIds } = require("node-opcua");
// 'fs' (File System) is a built-in Node.js module for interacting with files.
const fs = require("fs");


// --- PART 2: CONFIGURATION ---
// All settings are grouped here for easy modification.

// The full address of the OPC UA server we want to connect to.
const endpointUrl = "opc.tcp://localhost:4841/my/new/server/";

// --- MODIFIED FOR 1-MINUTE LOGGING ---
// The interval for our main data logging task (in milliseconds).
// 60 * 1000 ms = 1 minute.
const LOG_INTERVAL = 60 * 1000;

// The interval for our connection keep-alive task (in milliseconds).
// This must be shorter than the server's session timeout.
// 15 * 1000 ms = 15 seconds.
const KEEP_ALIVE_INTERVAL = 15 * 1000;

// An array containing the Node IDs of all the tags we want to read from the server.
const tagNodeIds = [
  "ns=1;s=Tag1", "ns=1;s=Tag2", "ns=1;s=Tag3", "ns=1;s=Tag4", "ns=1;s=Tag5",
  "ns=1;s=Tag6", "ns=1;s=Tag7", "ns=1;s=Tag8", "ns=1;s=Tag9", "ns=1;s=Tag10",
];


// --- PART 3: HELPER FUNCTIONS ---
// Small, reusable functions that handle specific tasks.

/**
 * --- REVERTED TO HOURLY FILENAME ---
 * Generates the name for the log file based on the current date and hour.
 * This ensures that a new file is used every hour.
 * @returns {string} The formatted filename (e.g., "OPC_Log_2025-09-01_22.csv").
 */
function getLogFilename() {
  const now = new Date();
  const year = now.getFullYear();
  // Add 1 to month because it's 0-indexed (0=Jan). PadStart ensures it's always 2 digits.
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  // Return the filename format based only on the hour.
  return `OPC_Log_${year}-${month}-${day}_${hour}.csv`;
}

/**
 * Checks if a log file already exists. If it doesn't, this function creates it
 * and writes the CSV header row. This prevents the header from being written
 * multiple times.
 * @param {string} filename - The name of the file to check.
 */
function ensureHeader(filename) {
  if (!fs.existsSync(filename)) {
    console.log(`Creating new log file: ${filename}`);
    const header = "Timestamp (24hr datetime),Timestamp (epochtime UTC)," +
                   "Tag1,Tag2,Tag3,Tag4,Tag5,Tag6,Tag7,Tag8,Tag9,Tag10\n";
    // writeFileSync is used here to create the file and write the header in one step.
    fs.writeFileSync(filename, header);
  }
}


// --- PART 4: MAIN APPLICATION ---
// The core logic of the client application is contained within this async function.

async function main() {
    // 4.1: Create the Client Instance
    // We create a client object with some initial settings.
    const client = OPCUAClient.create({
        // This tells the client to try connecting even if the endpoint isn't immediately found.
        endpoint_must_exist: false,
        // This strategy tells the client to automatically retry connecting if it fails.
        connectionStrategy: { maxRetry: 5, initialDelay: 2000, maxDelay: 10000 }
    });

    // 4.2: Connect and Create a Session
    // A 'try...catch' block is used to handle any errors during the initial connection.
    try {
        // Asynchronously connect to the server's endpoint URL.
        await client.connect(endpointUrl);
        console.log("✅ Client connected to server.");

        // After connecting, create a secure communication session with the server.
        const session = await client.createSession();
        console.log("✅ Session created.");


        // 4.3: THE DUAL-TIMER ARCHITECTURE
        // We set up two independent, repeating timers to handle our tasks.

        // --- Timer 1: The Data Logger ---
        // This timer handles the main task of reading and logging data.
        console.log(`🚀 Starting data logging every ${LOG_INTERVAL / 1000} seconds.`);
        setInterval(async () => {
            // This inner 'try...catch' prevents a single logging failure from crashing the whole app.
            try {
                // Step A: Determine the correct log file for the current hour.
                const filename = getLogFilename();
                ensureHeader(filename);

                // Step B: Get current timestamps.
                const now = new Date();
                const formattedTimestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                const epochTimestamp = Math.floor(now.getTime() / 1000);

                // Step C: Prepare the list of nodes to be read.
                const nodesToRead = tagNodeIds.map(nodeId => ({ nodeId, attributeId: AttributeIds.Value }));
                
                // Step D: Perform the read operation. We pass only the array of nodes.
                const dataValues = await session.read(nodesToRead);
                
                // Step E: Extract and format the values from the server's response.
                const tagValues = dataValues.map(dv => dv.value ? dv.value.value.toFixed(4) : "N/A");
                
                // Step F: Create the CSV line and append it to the file.
                const csvLine = `${formattedTimestamp},${epochTimestamp},${tagValues.join(",")}\n`;
                fs.appendFileSync(filename, csvLine); // appendFileSync adds the line without overwriting the file.
                console.log(`📝 Logged data at ${formattedTimestamp}`);

            } catch (err) {
                // If anything goes wrong inside this timer, log the full error but don't stop the application.
                console.error("❌ An error occurred in the data logging function. Full details below:");
                console.error(err);
            }
        }, LOG_INTERVAL);

        // --- Timer 2: The Keep-Alive Ping ---
        // This timer's only job is to keep the connection active.
        let pingCounter = 0;
        console.log(`❤️  Starting keep-alive ping every ${KEEP_ALIVE_INTERVAL / 1000} seconds.`);
        setInterval(async () => {
            try {
                // We perform a very lightweight read of a standard server node (its internal clock).
                // This small amount of communication is enough to prevent the session from timing out.
                await session.read({ nodeId: "ns=0;i=2258", attributeId: AttributeIds.Value });
                pingCounter++;
                console.log(`❤️  (Ping ${pingCounter}) Session keep-alive successful.`);
            } catch (err) {
                // If the ping fails, it might mean the connection is truly lost.
                console.error(`❌ Keep-alive ping failed: ${err.message}`);
            }
        }, KEEP_ALIVE_INTERVAL);

    } catch (err) {
        // If the initial client.connect() or session creation fails, log the error and exit.
        console.error(`❌ Could not start client: ${err.message}`);
        process.exit(1); // Exit with a non-zero code to indicate failure.
    }

    // 4.4: Graceful Shutdown
    // This part listens for the "Ctrl+C" command in the terminal.
    process.on("SIGINT", async () => {
        console.log("\nDisconnecting...");
        // Properly disconnect the client from the server.
        await client.disconnect();
        console.log("Client disconnected.");
        // Exit the application cleanly.
        process.exit(0);
    });
}

// 4.5: Start the Application
// This final line calls the main function to kick everything off.
main();