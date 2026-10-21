import { Router } from "express";
import memberRouter from "./member.routes";
import { Multer } from "multer";
import interviewRouter from "./interviews"
import topicRouter from "./topics.routes";
import { auth } from "../middleware/memberAuth";
import progressRoutes from "./progress.routes";
import birthdayRouter from "./birthday.routes";

export default function routes(upload:Multer){
    const router = Router();

    router.use('/members', upload.single('file'), memberRouter(upload));
    
    router.use("/interviews", interviewRouter());
    router.use('/topics',topicRouter());

    // Birthday routes – public (no auth required for calendar display)
    router.use('/birthdays', birthdayRouter());

    router.use(auth);
    router.use('/progress',progressRoutes());

    return router;
}