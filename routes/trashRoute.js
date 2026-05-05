import express from "express";
import {
  getGlobalTrash,
  restoreTrashItem,
  permanentDeleteTrashItem,
} from "../controllers/trashController.js";
import adminAuth from "../middleware/adminAuth.js";

const trashRouter = express.Router();

trashRouter.get("/list", adminAuth, getGlobalTrash);
trashRouter.post("/restore", adminAuth, restoreTrashItem);
trashRouter.post("/permanent-delete", adminAuth, permanentDeleteTrashItem);

export default trashRouter;