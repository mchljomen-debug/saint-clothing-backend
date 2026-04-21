import express from "express";
import {
  getRegions,
  getProvinces,
  getMunicipalities,
  getBarangays,
  reverseGeocode,
} from "../controllers/addressController.js";

console.log("addressRoute loaded");

const router = express.Router();

router.get("/regions", getRegions);
router.get("/provinces", getProvinces);
router.get("/municipalities", getMunicipalities);
router.get("/barangays", getBarangays);
router.get("/reverse-geocode", reverseGeocode);

export default router;