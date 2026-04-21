import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { getPolicies, getTermsPolicy, updatePolicies } from "../controllers/policyController.js";

const policyRouter = express.Router();

policyRouter.get("/", getPolicies);
policyRouter.get("/terms", getTermsPolicy);
policyRouter.put("/update", adminAuth, updatePolicies);

export default policyRouter;