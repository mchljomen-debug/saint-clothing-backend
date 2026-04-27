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
    <div style="font-family: Helvetica, Arial, sans-serif; background-color: #F8F8F6; padding: 40px 0; color: #111111;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-top: 4px solid #111111; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <div style="padding: 30px; text-align: center; background-color: #111111;">
          <h1 style="color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 4px; margin: 0; text-transform: uppercase;">
            SAINT
          </h1>
          <p style="color: #BDBDBD; font-size: 10px; font-weight: 700; letter-spacing: 2px; margin: 8px 0 0; text-transform: uppercase;">
            Clothing Account Verification
          </p>
        </div>

        <div style="padding: 40px 30px; text-align: center;">
          <p style="font-size: 11px; font-weight: bold; color: #999999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
            Verification Code
          </p>

          <h2 style="font-size: 17px; font-weight: 800; color: #111111; margin-bottom: 25px;">
            Confirm Your Identity
          </h2>
          
          <div style="background-color: #FAFAF8; border: 1px dashed #111111; padding: 22px; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 34px; font-weight: 900; color: #111111; letter-spacing: 10px; font-family: monospace;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 13px; color: #555555; line-height: 1.6;">
            This One-Time Password is valid for <strong>1 minute</strong>.<br/>
            Enter this code to continue your Saint Clothing session.
          </p>
          
          <p style="font-size: 11px; color: #111111; font-weight: bold; margin-top: 30px; text-transform: uppercase;">
            Do not share this code with anyone.
          </p>
        </div>

        <div style="padding: 20px; background-color: #F4F4F4; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="font-size: 10px; color: #999999; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin: 0;">
            SAINT CLOTHING // AUTOMATED VERIFICATION
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