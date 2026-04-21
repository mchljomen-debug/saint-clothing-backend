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
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0; color: #0A0D17;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-top: 4px solid #ED3500; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <div style="padding: 30px; text-align: center; background-color: #0A0D17;">
          <h1 style="color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase; font-style: italic;">
            System <span style="color: #ED3500;">Authentication</span>
          </h1>
        </div>

        <div style="padding: 40px 30px; text-align: center;">
          <p style="font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">
            Security Access Protocol
          </p>
          <h2 style="font-size: 16px; font-weight: 700; color: #0A0D17; margin-bottom: 25px;">
            Verify Your Personnel Identity
          </h2>
          
          <div style="background-color: #F4F7FF; border: 1px dashed #1055C9; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <span style="font-size: 32px; font-weight: 900; color: #1055C9; letter-spacing: 10px; font-family: monospace;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 13px; color: #555; line-height: 1.6;">
            This One-Time Password (OTP) is valid for <strong>1 minute</strong>.<br/>
            Input this code into the telemetry dashboard to finalize your session.
          </p>
          
          <p style="font-size: 11px; color: #ED3500; font-weight: bold; margin-top: 30px; text-transform: uppercase; font-style: italic;">
            Notice: Do not share this sequence with unauthorized personnel.
          </p>
        </div>

        {/* Footer */}
        <div style="padding: 20px; background-color: #f4f4f4; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="font-size: 10px; color: #aaa; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin: 0;">
            THE PADDOCK // AUTOMATED DISPATCH SYSTEM
          </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Paddock System" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `ACCESS CODE: ${otp} - Verification Required`,
    html: htmlContent,
  });
};