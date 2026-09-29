const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});
transporter.verify(function (error, success) {
    if (error) {
        console.error("SMTP verification failed:", error);
    } else {
        console.log("SMTP server is ready");
    }
});

async function sendContactEmail({ name, email, message }) {

    await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.CONTACT_EMAIL,
        replyTo: email,
        subject: `Secretary AI Contact Form - ${name}`,
        text:
            `Name: ${name}
            Email: ${email}
            Message:
            ${message}`
    });

}

module.exports = {
    sendContactEmail
};