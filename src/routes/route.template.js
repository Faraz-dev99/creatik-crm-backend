import express from "express";
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "../controllers/controller.template.js";
import { isAdministrator, protectRoute } from "../middlewares/auth.js";

const templateRoute = express.Router();

templateRoute.use(protectRoute);

templateRoute.post("/", createTemplate);
templateRoute.get("/", isAdministrator, getTemplates);
templateRoute.get("/:id", isAdministrator, getTemplateById);
templateRoute.put("/:id", isAdministrator, updateTemplate);
templateRoute.delete("/:id", isAdministrator, deleteTemplate);

export default templateRoute;
