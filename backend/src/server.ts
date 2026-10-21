import app from "./app";
import config from "./config";
import { startBirthdayScheduler, stopBirthdayScheduler } from "./services/birthdayScheduler";

const PORT = config.port;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startBirthdayScheduler();
});

// Stop the birthday scheduler and worker before exiting, so a deploy doesn't
// cut a batch off halfway.
function shutdown(signal: string) {
    console.log(`${signal} received, shutting down.`);
    stopBirthdayScheduler();
    server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
