const { verify } = require("jsonwebtoken");
const AccessControl = require("express-ip-access-control");
const { Mentor } = require("@payr/schemata");
const { Logger } = require("../../config");

module.exports = {
    /**
     * Allows only requests containing valid x-payr-app-key header
     * @param {import("express").Request} req The express request object
     * @param {import("express").Response} res The express response object
     * @param {import("express").NextFunction} next The express next function
     * @returns {Promise<import("express").Response>} The express response
     * @returns 403, message: If invalid header
     */
    appKey: async (req, res, next) => {
        try {
            if (req.header("x-payr-app-key") !== process.env.X_PAYR_APP_KEY) {
                return res
                    .status(401)
                    .json({ message: "Unauthorized access to api." });
            }
            next();
        } catch (e) {
            console.log(e);
        }
    },

    authenticate:
        ({
            noReject = false,
            allowInactive = false,
            allowWithout2FA = false,
            adminOnly = false,
        }) =>
        /**
         * @param {import("express").Request} req The express request object
         * @param {import("express").Response} res The express response object
         * @param {import("express").NextFunction} next The express next function
         * @returns {Promise<import("express").Response>} The express response
         * @returns 403|401 message: If unauthorized
         */
        async (req, res, next) => {
            try {
                let decoded = {};
                let token = null;
                if (
                    req.headers != undefined &&
                    req.headers.authorization &&
                    req.headers.authorization.split(" ").length == 2
                ) {
                    token = req.headers.authorization.split(" ")[1];
                }
                try {
                    decoded = verify(token, process.env.JWT_SECRET_KEY);
                } catch (e) {
                    if (!noReject)
                        return res
                            .status(401)
                            .json({ message: "Invalid session." });
                }
                let { id, pending2FA } = decoded;
                if (pending2FA && !allowWithout2FA) {
                    return res
                        .status(401)
                        .json({ message: "Pending two-factor authentication" });
                }
                if (id) {
                    let user = await Mentor.findOne({
                        _id: id,
                    }).select(
                        "_id emailAddress fullName username userImage is_active is_admin ipAllowList ipDenyList twoFactor totpKey"
                    );
                    if (user) {
                        if (!user.is_active && !allowInactive) {
                            return res.status(401).json({
                                message: "Your account is not active.",
                            });
                        }
                        if (user.ipAllowList && user.ipAllowList.length > 0) {
                            if (
                                !AccessControl.ipMatch(
                                    req.ip,
                                    user.ipAllowList
                                ) &&
                                !AccessControl.ipMatch(
                                    req.clientIp,
                                    user.ipAllowList
                                )
                            ) {
                                return res.status(403).json({
                                    message: "Access restricted",
                                    your_ip: req.ip,
                                    other: req.clientIp,
                                });
                            }
                        }
                        if (user.ipDenyList && user.ipDenyList.length > 0) {
                            if (
                                AccessControl.ipMatch(
                                    req.ip,
                                    user.ipDenyList
                                ) ||
                                AccessControl.ipMatch(
                                    req.clientIp,
                                    user.ipDenyList
                                )
                            ) {
                                return res.status(403).json({
                                    message: "Access restricted",
                                    your_ip: req.ip,
                                    other: req.clientIp,
                                });
                            }
                        }
                        if (adminOnly && !user.is_admin) {
                            return res.status(403).json({
                                message: "0nly admin.",
                            });
                        }

                        req.user = user;
                        req.token = token;
                    } else {
                        return res
                            .status(401)
                            .json({ message: "Invalid user authentication." });
                    }
                } else if (!noReject) {
                    return res
                        .status(401)
                        .json({ message: "Invalid user authentication." });
                }
                next();
            } catch (e) {
                Logger.error(e);
                return res
                    .status(503)
                    .json({ message: "Something went wrong" });
            }
        },
};
