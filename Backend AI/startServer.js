require("dotenv").config();
const { startServer } = require("./server.js");

console.log("Starting server...");

async function main() {
  try {
    await startServer();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
