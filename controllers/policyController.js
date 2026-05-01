import policyModel from "../models/policyModel.js";
import { addLog } from "../utils/activityLogger.js";

const TERMS_KEY = "terms-and-conditions";
const PRIVACY_KEY = "privacy-policy";

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

const defaultPayload = {
  slug: "main",
  version: new Date().toISOString().slice(0, 10),
  title: "Saint Clothing Policies",
  description:
    "Store rules, terms, privacy, shipping, returns, and payment policies.",
  policies: [
    {
      key: "privacy-policy",
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
    {
      key: "shipping-policy",
      title: "Shipping Policy",
      content: [],
      requiredOnRegister: false,
      sortOrder: 3,
      isActive: true,
    },
    {
      key: "return-refund-policy",
      title: "Return and Refund Policy",
      content: [],
      requiredOnRegister: false,
      sortOrder: 4,
      isActive: true,
    },
    {
      key: "payment-policy",
      title: "Payment Policy",
      content: [],
      requiredOnRegister: false,
      sortOrder: 5,
      isActive: true,
    },
  ],
};

const ensureMainPolicy = async () => {
  let doc = await policyModel.findOne({ slug: "main" });

  if (!doc) {
    doc = await policyModel.create(defaultPayload);
  }

  return doc;
};

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

export const updatePolicies = async (req, res) => {
  try {
    const { title, description, version, policies } = req.body;

    const doc = await ensureMainPolicy();

    if (typeof title === "string") {
      doc.title = title.trim() || doc.title;
    }

    if (typeof description === "string") {
      doc.description = description.trim();
    }

    if (typeof version === "string" && version.trim()) {
      doc.version = version.trim();
    }

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

    doc.updatedBy = req.body.updatedBy || req.body.userId || "admin";
    await doc.save();

    await addLog({
      action: "POLICIES_UPDATED",
      message: `Policies updated to version ${doc.version}`,
      user: doc.updatedBy,
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