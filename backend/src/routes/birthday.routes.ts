/**
 * birthday.routes.ts
 * Routes for birthday calendar endpoints.
 * Follows the existing Router-factory pattern used in the project.
 */

import { Router } from "express";
import {
  getBirthdaysForMonth,
  getTodaysBirthdays,
  getUpcomingBirthdaysCtrl,
  triggerBirthdayJob,
  sendTestBirthdayEmailCtrl,
} from "../controllers/birthday.controller";

export default function birthdayRouter(): Router {
  const router = Router();

  // Public calendar endpoints – no auth required
  router.get("/today", getTodaysBirthdays);
  router.get("/upcoming", getUpcomingBirthdaysCtrl);
  router.get("/", getBirthdaysForMonth);

  // Admin / Testing endpoints (protected by BIRTHDAY_JOB_SECRET header)
  router.post("/run-job", triggerBirthdayJob);
  router.post("/test-email", sendTestBirthdayEmailCtrl);

  return router;
}
