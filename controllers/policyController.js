import policyModel from "../models/policyModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

const TERMS_KEY = "terms-and-conditions";
const PRIVACY_KEY = "privacy-policy";

/* ==============================
   NORMALIZE CONTENT
============================== */
const normalizeContent = (content = []) => {
  if (!Array.isArray(content)) return [];

  return content
    .map((item) => {
      if (typeof item === "string") {
        return {
          title: "",
          text: item.trim(),
        };
      }

      return {
        title: String(item?.title || "").trim(),
        text: String(item?.text || "").trim(),
      };
    })
    .filter((item) => item.title || item.text);
};

/* ==============================
   DEFAULT POLICY
============================== */
const defaultPayload = {
  slug: "main",
  version: new Date().toISOString().slice(0, 10),
  title: "Saint Clothing Policies",
  description:
    "Store rules, terms, privacy, shipping, returns, and payment policies.",
  policies: [
    {
      key: PRIVACY_KEY,
      title: "Privacy Policy",
      content: [],
      requiredOnRegister: false,
      sortOrder: 1,
      isActive: true,
    },
    {
      key: TERMS_KEY,
      title: "Terms and Conditions",
      content: [],
      requiredOnRegister: true,
      sortOrder: 2,
      isActive: true,
    },
  ],
};

/* ==============================
   ENSURE MAIN POLICY EXISTS
============================== */
const ensureMainPolicy = async () => {
  let doc = await policyModel.findOne({ slug: "main" });

  if (!doc) {
    doc = await policyModel.create(defaultPayload);
  }

  return doc;
};

/* ==============================
   GET ALL POLICIES
============================== */
export const getPolicies = async (req, res) => {
  try {
    const doc = await ensureMainPolicy();

    const sortedPolicies = [...(doc.policies || [])]
      .filter((item) => item.isActive !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((item) => ({
        ...(item.toObject ? item.toObject() : item),
        content: normalizeContent(item.content),
      }));

    return res.json({
      success: true,
      policySet: {
        _id: doc._id,
        slug: doc.slug,
        version: doc.version,
        title: doc.title,
        description: doc.description,
        policies: sortedPolicies,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.log("GET POLICIES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ==============================
   GET TERMS
============================== */
export const getTermsPolicy = async (req, res) => {
  try {
    const doc = await ensureMainPolicy();

    const terms = (doc.policies || []).find(
      (item) => item.key === TERMS_KEY && item.isActive !== false
    );

    return res.json({
      success: true,
      version: doc.version,
      title: terms?.title || "Terms and Conditions",
      content: normalizeContent(terms?.content || []),
      requiredOnRegister: true,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.log("GET TERMS POLICY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ==============================
   GET PRIVACY
============================== */
export const getPrivacyPolicy = async (req, res) => {
  try {
    const doc = await ensureMainPolicy();

    const privacy = (doc.policies || []).find(
      (item) => item.key === PRIVACY_KEY && item.isActive !== false
    );

    return res.json({
      success: true,
      version: doc.version,
      title: privacy?.title || "Privacy Policy",
      content: normalizeContent(privacy?.content || []),
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.log("GET PRIVACY POLICY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ==============================
   UPDATE POLICIES (WITH HISTORY)
============================== */
export const updatePolicies = async (req, res) => {
  try {
    const { title, description, version, policies } = req.body;

    const doc = await ensureMainPolicy();

    /* ==============================
       UPDATE MAIN INFO
    ============================== */
    if (typeof title === "string") {
      doc.title = title.trim() || doc.title;
    }

    if (typeof description === "string") {
      doc.description = description.trim();
    }

    if (typeof version === "string" && version.trim()) {
      doc.version = version.trim();
    }

    /* ==============================
       UPDATE POLICIES LIST
    ============================== */
    if (Array.isArray(policies)) {
      doc.policies = policies.map((item, index) => {
        const key = String(item.key || `policy-${index + 1}`)
          .trim()
          .toLowerCase();

        return {
          key,
          title: String(item.title || `Policy ${index + 1}`).trim(),
          content: normalizeContent(item.content),
          requiredOnRegister: key === TERMS_KEY,
          sortOrder:
            typeof item.sortOrder === "number" ? item.sortOrder : index + 1,
          isActive: item.isActive !== false,
        };
      });
    }

    await doc.save();

    /* ==============================
       🔥 ACTIVITY LOG (FIXED)
    ============================== */
    await addLog({
      action: "POLICIES_UPDATED",
      message: `Policies updated (Version: ${doc.version})`,
      user: getActorName(req),
      entityId: doc._id,
      entityType: "Policy",
    });

    return res.json({
      success: true,
      message: "Policies updated successfully",
      policySet: doc,
    });
  } catch (err) {
    console.log("UPDATE POLICIES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};