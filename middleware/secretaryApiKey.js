function requireSecretaryApiKey(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized."
        });
    }

    const [scheme, token] = authorization.split(" ");

    if (
        scheme !== "Bearer" ||
        !token ||
        token !== process.env.SECRETARY_API_KEY
    ) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized."
        });
    }

    next();
}

module.exports = requireSecretaryApiKey;