import app from "./app";
import config from "./config";
import { startBirthdayScheduler } from "./services/birthdayScheduler";

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startBirthdayScheduler();
});