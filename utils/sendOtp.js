import nodemailer from "nodemailer";

export const sendOTP = async (email, otp) => {
  try {
    console.log("ENV CHECK GMAIL_USER:", process.env.GMAIL_USER);
    console.log(
      "ENV CHECK GMAIL_PASS:",
      process.env.GMAIL_PASS ? "EXISTS" : "MISSING"
    );

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      throw new Error("GMAIL_USER or GMAIL_PASS is missing");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.verify();

    const htmlContent = `
      <div style="font-family: Helvetica, Arial, sans-serif; background:#F8F8F6; padding:40px 0; color:#111;">
        <div style="max-width:500px; margin:0 auto; background:#fff; border-top:4px solid #111;">
          <div style="padding:30px; text-align:center; background:#111;">
            <h1 style="color:#fff; font-size:20px; font-weight:900; letter-spacing:4px; margin:0;">
              SAINT
            </h1>
            <p style="color:#bdbdbd; font-size:10px; letter-spacing:2px; margin-top:8px;">
              CLOTHING ACCOUNT VERIFICATION
            </p>
          </div>

          <div style="padding:40px 30px; text-align:center;">
            <p style="font-size:11px; font-weight:bold; color:#999; letter-spacing:1.5px;">
              VERIFICATION CODE
            </p>

            <div style="background:#FAFAF8; border:1px dashed #111; padding:22px; margin:20px 0; border-radius:8px;">
              <span style="font-size:34px; font-weight:900; color:#111; letter-spacing:10px; font-family:monospace;">
                ${otp}
              </span>
            </div>

            <p style="font-size:13px; color:#555; line-height:1.6;">
              This One-Time Password is valid for <strong>1 minute</strong>.<br/>
              Enter this code to continue your Saint Clothing session.
            </p>

            <p style="font-size:11px; color:#111; font-weight:bold; margin-top:30px;">
              DO NOT SHARE THIS CODE WITH ANYONE.
            </p>
          </div>

          <div style="padding:20px; background:#f4f4f4; text-align:center;">
            <p style="font-size:10px; color:#999; font-weight:bold; letter-spacing:1px; margin:0;">
              SAINT CLOTHING // AUTOMATED VERIFICATION
            </p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Saint Clothing" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `SAINT Verification Code: ${otp}`,
      html: htmlContent,
    });

    console.log("OTP EMAIL SENT:", info.messageId);
    return info;
  } catch (error) {
    console.log("SEND OTP EMAIL ERROR:", error.message);
    throw new Error(error.message || "Failed to send OTP email");
  }
};