import express from "express";

import adminAuth from "../middleware/adminAuth.js";

import {
  getPolicies,
  getTermsPolicy,
  getPrivacyPolicy,
  updatePolicies,
} from "../controllers/policyController.js";

const policyRouter = express.Router();

/*
|--------------------------------------------------------------------------
| Public Policy Routes
|--------------------------------------------------------------------------
*/

policyRouter.get("/", getPolicies);

policyRouter.get("/terms", getTermsPolicy);

policyRouter.get("/privacy", getPrivacyPolicy);

/*
|--------------------------------------------------------------------------
| Admin Policy Routes
|--------------------------------------------------------------------------
*/

policyRouter.put(
  "/update",
  adminAuth,
  updatePolicies
);

export default policyRouter;