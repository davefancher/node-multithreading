# Node.js Multithreading

Node.js's sweet spot has traditionally been with I/O-intensive processes. It's event-driven architecture allows I/O operations to run concurrently while their associated callbacks are executed synchronously in the event loop. This, however, comes with a dark side in that CPU-bound operations are likely to block the event loop thus delaying when those callbacks are invoked. Fortunately, Node.js ships with several modules that allow us to offload those blocking CPU-bound operations from the main event loop so it's free to handle other tasks while the CPU-bound operations go about their business. Most notably we'll explore some ways in which the `child_process` and `worker_threads` modules can keep your Node.js application performant while still handling those CPU-intensive operations.

## Setting Up The Demo

1. Clone the repository
2. Install packages `npm i`

## Running the Demo

**In VS Code**

1. Open the folder in Visual Studio Code
2. Run the project
3. Navigate to http://localhost

**From the CLI**

1. Navigate to the folder containing the demo
2. Run `node app.js`
3. Navigate to http://localhost
