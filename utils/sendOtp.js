import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTP = async (email, otp) => {
  try {
    const htmlContent = `
      <div style="font-family: Helvetica, Arial, sans-serif; background:#F8F8F6; padding:40px 0; color:#111;">
        <div style="max-width:500px; margin:0 auto; background:#fff; border-top:4px solid #111;">
          
          <div style="padding:30px; text-align:center; background:#111;">
            <h1 style="color:#fff; font-size:20px; font-weight:900;">SAINT</h1>
            <p style="color:#bdbdbd; font-size:10px;">
              CLOTHING ACCOUNT VERIFICATION
            </p>
          </div>

          <div style="padding:40px 30px; text-align:center;">
            <p style="font-size:11px; color:#999;">VERIFICATION CODE</p>

            <div style="background:#FAFAF8; border:1px dashed #111; padding:22px; margin:20px 0;">
              <span style="font-size:34px; font-weight:900; letter-spacing:10px;">
                ${otp}
              </span>
            </div>

            <p style="font-size:13px; color:#555;">
              Valid for <strong>1 minute</strong>.
            </p>
          </div>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: [email],
      subject: `SAINT Verification Code: ${otp}`,
      html: htmlContent,
    });

    if (error) {
      console.log("RESEND ERROR:", error);
      throw new Error(error.message);
    }

    console.log("OTP SENT:", data?.id);
    return data;

  } catch (error) {
    console.log("SEND OTP ERROR:", error.message);
    throw new Error(error.message);
  }
};