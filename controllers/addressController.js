import axios from "axios";

const PSGC_CLOUD = "https://psgc.cloud/api";
const PSGC_CLOUD_V2 = "https://psgc.cloud/api/v2";

/* =========================
   NORMALIZER (VERY IMPORTANT FIX)
========================= */
const normalizeList = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return list
    .map((item) => ({
      code: String(
        item?.code ||
          item?.psgcCode ||
          item?.psgc_id ||
          item?.id ||
          item?.region_code ||
          item?.province_code ||
          item?.city_code ||
          item?.municipality_code ||
          ""
      ),
      name: String(
        item?.name ||
          item?.regionName ||
          item?.provinceName ||
          item?.cityName ||
          item?.municipalityName ||
          item?.cityMunicipalityName ||
          item?.area_name ||
          ""
      ),
    }))
    .filter((item) => item.code && item.name);
};

/* =========================
   REGIONS
========================= */
export const getRegions = async (req, res) => {
  try {
    const response = await axios.get(`${PSGC_CLOUD}/regions`);

    return res.json({
      success: true,
      data: normalizeList(response.data),
    });
  } catch (error) {
    console.error("GET REGIONS ERROR:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch regions",
    });
  }
};

/* =========================
   PROVINCES
========================= */
export const getProvinces = async (req, res) => {
  try {
    const { reg } = req.query;

    if (!reg) {
      return res.status(400).json({
        success: false,
        message: "Region code is required",
      });
    }

    const response = await axios.get(
      `${PSGC_CLOUD_V2}/regions/${encodeURIComponent(reg)}/provinces`
    );

    return res.json({
      success: true,
      data: normalizeList(response.data),
    });
  } catch (error) {
    console.error("GET PROVINCES ERROR:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provinces",
    });
  }
};

/* =========================
   CITIES / MUNICIPALITIES
========================= */
export const getMunicipalities = async (req, res) => {
  try {
    const { reg, prv } = req.query;

    // NCR special case (no province)
    if (reg === "1300000000") {
      const response = await axios.get(
        `${PSGC_CLOUD_V2}/regions/${encodeURIComponent(reg)}/cities-municipalities`
      );

      return res.json({
        success: true,
        data: normalizeList(response.data),
      });
    }

    if (!prv) {
      return res.status(400).json({
        success: false,
        message: "Province code is required",
      });
    }

    const response = await axios.get(
      `${PSGC_CLOUD_V2}/provinces/${encodeURIComponent(prv)}/cities-municipalities`
    );

    return res.json({
      success: true,
      data: normalizeList(response.data),
    });
  } catch (error) {
    console.error(
      "GET MUNICIPALITIES ERROR:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cities / municipalities",
    });
  }
};

/* =========================
   BARANGAYS
========================= */
export const getBarangays = async (req, res) => {
  try {
    const { mun } = req.query;

    if (!mun) {
      return res.status(400).json({
        success: false,
        message: "Municipality/city code is required",
      });
    }

    const response = await axios.get(
      `${PSGC_CLOUD_V2}/cities-municipalities/${encodeURIComponent(mun)}/barangays`
    );

    return res.json({
      success: true,
      data: normalizeList(response.data),
    });
  } catch (error) {
    console.error("GET BARANGAYS ERROR:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch barangays",
    });
  }
};

/* =========================
   REVERSE GEOCODE
========================= */
export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat,
          lon,
          format: "jsonv2",
          addressdetails: 1,
        },
        headers: {
          "User-Agent": "SaintClothing/1.0 (address-picker)",
        },
      }
    );

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "REVERSE GEOCODE ERROR:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Failed to reverse geocode",
    });
  }
};