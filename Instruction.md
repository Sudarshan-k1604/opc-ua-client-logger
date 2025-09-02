# OPC UA Data Logger - Setup and Run Instructions

---

## Overview

This document provides step-by-step instructions to set up and run the OPC UA server simulator and the data logging client on your local machine. The server will simulate an industrial device, and the client will connect to it to **log data every minute** into **hourly CSV files**.

---

## 1. Prerequisites

Before you begin, please ensure you have the following software installed on your system:

- **Node.js:** This is the runtime environment for the project. A version of 16.x or higher is recommended.  
- **npm (Node Package Manager):** This comes bundled with Node.js and is used to install project dependencies.

You can verify your installation by opening a terminal or command prompt and running:

```bash
node -v
npm -v
```

If these commands return version numbers, you are ready to proceed.

---

## 2. Setup Steps

1. **Download the Source Code:**
   - Download the project files as a ZIP archive and extract them to a folder on your computer.  
   - Alternatively, if you have Git installed, clone the repository:
     ```bash
     git clone https://github.com/your-username/opc-ua-client-logger.git
     ```

2. **Open the Project Directory:**
   - Navigate into the project folder using your terminal or command prompt.
     ```bash
     cd path/to/opc-ua-client-logger
     ```

3. **Install Dependencies:**
   - Once inside the project directory, run the following command to download and install the required `node-opcua` library.
     ```bash
     npm install
     ```
   - This will create a `node_modules` folder in your project directory.

---

## 3. Execution Steps

To run the application, you will need **two separate terminals** (or command prompts) open in the same project directory. One will run the server, and the other will run the client.

### Step 3.1: Start the OPC UA Server Simulator

In your **first terminal**, execute the following command:

```bash
node opc_ua_server.js
```

**Expected Output:** The server will start, and you will see a confirmation message. The server is now running and waiting for a client to connect.

```
✅ Final OPC UA Server is now running.
Endpoint URL: opc.tcp://your-pc-name:4841/my/new/server/
Press (Ctrl+C) to stop the server.
```

*Leave this terminal running.*

---

### Step 3.2: Start the OPC UA Client Logger

In your **second terminal**, execute the following command:

```bash
node opc_ua_client.js
```

**Expected Output:** The client will start, connect to the server, and begin its logging and keep-alive cycles. The console will show data being logged **every 60 seconds**.

```
✅ Client connected to server.
✅ Session created.
🚀 Starting data logging every 60 seconds.
❤️  Starting keep-alive ping every 15 seconds.
❤️  (Ping 1) Session keep-alive successful.
❤️  (Ping 2) Session keep-alive successful.
❤️  (Ping 3) Session keep-alive successful.
📝 Logged data at 2025-09-01 22:47:15
❤️  (Ping 4) Session keep-alive successful.
...
```

The application is now running successfully.

---

## 4. Verifying the Output

To confirm that data is being logged, check the project directory. You will find CSV files being created with the following naming format:

```
OPC_Log_YYYY-MM-DD_HH.csv
```

For example, a file created at 10 PM on September 1, 2025, will be named:

```
OPC_Log_2025-09-01_22.csv
```

All data logged within that hour will be appended to this single file. A new file will be automatically created as soon as the hour changes.

---

## 5. Stopping the Application

To stop the client and server, go to **each of the two terminals** and press:

```
Ctrl + C
```

This will gracefully shut down the processes.

---
