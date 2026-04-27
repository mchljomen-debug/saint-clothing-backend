export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const authUserId = req.userId || req.body.userId;

    console.log("===== PROFILE UPDATE START =====");
    console.log("USER ID PARAM:", userId);
    console.log("AUTH USER ID:", authUserId);
    console.log("BODY DATA:", req.body);
    console.log("HAS FILE:", !!req.file);
    console.log(
      "FILE DATA:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            hasBuffer: !!req.file.buffer,
          }
        : null
    );

    if (!authUserId || String(authUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized profile update",
      });
    }

    let { firstName, lastName, email, phone, address } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked accounts cannot update profile",
      });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (email && email !== user.email) {
      const normalizedEmail = String(email).trim().toLowerCase();

      const emailTaken = await userModel.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (typeof address === "string") {
      try {
        address = JSON.parse(address);
      } catch (error) {
        console.log("ADDRESS PARSE ERROR:", error);

        return res.status(400).json({
          success: false,
          message: "Invalid address format",
        });
      }
    }

    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();

    if (firstName !== undefined || lastName !== undefined) {
      user.name = buildFullName(user.firstName, user.lastName);
    }

    if (email !== undefined) user.email = String(email).trim().toLowerCase();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (address !== undefined) user.address = normalizeAddress(address);

    if (req.file?.buffer) {
      console.log("AVATAR RECEIVED. UPLOADING TO CLOUDINARY...");

      const uploadedAvatar = await uploadBufferToCloudinary(
        req.file.buffer,
        "saint-clothing/avatars"
      );

      console.log("CLOUDINARY AVATAR URL:", uploadedAvatar.secure_url);

      user.avatar = uploadedAvatar.secure_url;
    } else {
      console.log("NO AVATAR FILE RECEIVED");
    }

    user.lastSeenAt = new Date();
    await user.save();

    const freshUser = await userModel.findById(userId).lean();

    await addLog({
      action: "USER_PROFILE_UPDATED",
      message: `Profile updated: ${freshUser.name || freshUser.email}`,
      user: freshUser.name || freshUser.email,
      entityId: freshUser._id,
      entityType: "User",
    });

    console.log("===== PROFILE UPDATE SUCCESS =====");

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(freshUser),
    });
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};