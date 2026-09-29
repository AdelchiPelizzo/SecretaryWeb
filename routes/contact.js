const express = require("express");
const router = express.Router();
console.log("Contact route loaded");

const { sendContactEmail } = require("../utils/mailer");

router.post("/contact", async (req, res) => {

    try {

        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).send("Please complete all fields.");
        }

        await sendContactEmail({
            name,
            email,
            message
        });

        res.send(`
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Message Sent</title>

                        <style>
                            body {
                                margin: 0;
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: #f7f8fc;
                                font-family: Arial, sans-serif;
                                color: #171b2b;
                            }

                            .confirmation {
                                width: min(90%, 520px);
                                box-sizing: border-box;
                                padding: 40px;
                                background: #ffffff;
                                border: 1px solid #e5e7ee;
                                border-radius: 16px;
                                text-align: center;
                                box-shadow: 0 8px 24px rgba(23, 27, 43, 0.08);
                            }

                            .confirmation h2 {
                                margin: 0 0 14px;
                                font-size: 26px;
                            }

                            .confirmation p {
                                margin: 0 0 28px;
                                color: #667085;
                                font-size: 16px;
                                line-height: 1.6;
                            }

                            .confirmation a {
                                display: inline-block;
                                padding: 11px 22px;
                                border: 1px solid #6c63ff;
                                border-radius: 8px;
                                background: #6c63ff;
                                color: #ffffff;
                                text-decoration: none;
                                font-weight: 600;
                            }

                            .confirmation a:hover {
                                background: #5b52e8;
                            }
                        </style>
                    </head>

                    <body>

                        <div class="confirmation">

                            <h2>Thank you for contacting us.</h2>

                            <p>
                                Your message has been sent successfully.
                            </p>

                            <a href="/">
                                Return to Secretary AI
                            </a>

                        </div>

                    </body>
                </html>

        `);

    } catch (error) {

        console.error("Contact form error:", error);

        res.status(500).send(
            "Sorry, your message could not be sent. Please try again later."
        );

    }

});

module.exports = router;