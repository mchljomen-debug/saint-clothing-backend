import { Resend } from "resend";

export const sendOTP = async (email, otp) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing");
    }

    if (!process.env.RESEND_FROM) {
      throw new Error("RESEND_FROM is missing");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const htmlContent = `
      <div style="font-family: Helvetica, Arial, sans-serif; background:#F8F8F6; padding:40px 0; color:#111;">
        <div style="max-width:500px; margin:0 auto; background:#fff; border-top:4px solid #111;">
          <div style="padding:30px; text-align:center; background:#111;">
            <h1 style="color:#fff; font-size:20px; font-weight:900; letter-spacing:4px; margin:0;">SAINT</h1>
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

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: `SAINT Verification Code: ${otp}`,
      html: htmlContent,
    });

    if (error) {
      console.log("RESEND OTP ERROR:", error);
      throw new Error(error.message || "Failed to send OTP email");
    }

    console.log("RESEND OTP SENT:", data?.id);
    return data;
  } catch (error) {
    console.log("SEND OTP ERROR:", error.message);
    throw new Error(error.message || "Failed to send OTP email");
  }
};