import axios from "axios";

const PSGC_CLOUD = "https://psgc.cloud/api";
const PSGC_CLOUD_V2 = "https://psgc.cloud/api/v2";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

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

export const getMunicipalities = async (req, res) => {
  try {
    const { reg, prv } = req.query;

    // NCR has no province layer, so fetch directly from region
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