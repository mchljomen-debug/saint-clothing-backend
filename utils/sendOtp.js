import nodemailer from "nodemailer";

export const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8F8F6; padding: 40px 0; color: #111111;">
      
      <div style="max-width: 480px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px; overflow: hidden;">
        
        <!-- HEADER -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.05);">
          <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 4px; color: #111111;">
            SAINT
          </h1>
          <p style="margin-top: 8px; font-size: 10px; letter-spacing: 2px; color: #8A8A8A; font-weight: 700;">
            CLOTHING
          </p>
        </div>

        <!-- BODY -->
        <div style="padding: 36px 28px; text-align: center;">
          
          <p style="font-size: 10px; font-weight: 900; letter-spacing: 2px; color: #8A8A8A; margin-bottom: 10px;">
            ACCOUNT VERIFICATION
          </p>

          <h2 style="font-size: 16px; font-weight: 800; color: #111111; margin-bottom: 24px;">
            Confirm Your Identity
          </h2>

          <!-- OTP BOX -->
          <div style="background-color: #FAFAF8; border: 1px solid rgba(0,0,0,0.08); padding: 20px; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 30px; font-weight: 900; letter-spacing: 10px; color: #111111;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 12px; color: #666666; line-height: 1.6;">
            This verification code is valid for <strong>1 minute</strong>.<br/>
            Enter this code to continue your session.
          </p>

          <p style="font-size: 11px; color: #111111; font-weight: 700; margin-top: 28px; letter-spacing: 1px;">
            DO NOT SHARE THIS CODE
          </p>
        </div>

        <!-- FOOTER -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid rgba(0,0,0,0.05); background-color: #FAFAF8;">
          <p style="font-size: 9px; color: #999999; letter-spacing: 2px; font-weight: 800; margin: 0;">
            SAINT CLOTHING SYSTEM
          </p>
        </div>

      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Saint Clothing" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `SAINT Verification Code: ${otp}`,
    html: htmlContent,
  });
};