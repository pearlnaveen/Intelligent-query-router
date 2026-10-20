// services/mailService.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

export const sendMail = async ({ to, subject, text, html }) => {
    if (!to || typeof to !== 'string' || !to.trim()) {
        console.warn("⚠️ sendMail skipped: No recipient email provided.");
        return { success: false, message: "No recipient defined" };
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_USER || process.env.EMAIL_USER,
            to: to.trim(),
            subject,
            text,
            html
        });
        return info;
    } catch (error) {
        console.error("Email sending failed:", error?.message || error);
        return { success: false, error: error?.message || "Email sending failed" };
    }
};
