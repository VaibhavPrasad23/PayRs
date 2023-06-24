const { Types } = require("mongoose");
const { sign, verify } = require("jsonwebtoken");
const { authenticator } = require("otplib");
const qrcode = require("qrcode");
const {
    Mentor,
    MentorEmail,
    MentorPhone,
    TwoFactorType,
    CountryDialCode,
} = require("@payr/schemata");
const { redis } = require("../../../datasource/redis");

const { IS_TEST } = require("../../../../config");
const { Logger } = require("../../../../config/logger");
const Cache = require("../../../utils/cache");
const Queue = require("../../../queue");

const Joi = require("../../../utils/joi");
const ms = require("ms");
const {
    generateOTPToken,
    verifyOTPToken,
    maskEmail,
    maskPhone,
} = require("../utils/auth");

module.exports = {
    /**
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {Promise<import("express").Response>}
     */
    sessionData: async (req, res) => {
        try {
            return res.json({ data: req.user.publicData() });
        } catch (e) {
            Logger.error(e);
            return res.status();
        }
    },

    /**
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {Promise<import("express").Response>}
     */
    loginWithPassword: async (req, res) => {
        try {
            let { emailAddress, password } = req.body;
            let user = null;
            let email = await MentorEmail.findOne({
                emailAddress: emailAddress,
                verified: true,
            }).select("mentor");
            if (!email) {
                return res.status(400).json({ message: "Invalid user." });
            }
            user = await Mentor.findOne({
                _id: email.mentor,
            }).select(
                "toBeDeleted suspended is_active hashed_password twoFactor"
            );
            if (!user) {
                return res.status(400).json({ message: "Invalid user." });
            }
            if (user.authenticate(password)) {
                if (user.toBeDeleted) {
                    return res.status(401).json({
                        message:
                            "Your account is scheduled to be deleted. Please contact the administrator.",
                    });
                }
                if (user.suspended) {
                    return res.status(401).json({
                        message: "Your account is currently suspended.",
                    });
                }
                if (!user.is_active) {
                    return res.status(401).json({
                        message:
                            "Your account is not active. Please contact the administrator.",
                    });
                }
                const token = user.getSessionToken(
                    process.env.JWT_SECRET_KEY,
                    process.env.LOGIN_VALIDITY || "1d",
                    {
                        pending2FA: user.twoFactor ? true : false,
                        ...(user.twoFactor
                            ? { twoFactor: user.twoFactor }
                            : {}),
                    }
                );
                return res.json({
                    message: "Login success.",
                    data: {
                        token,
                    },
                });
            } else {
                return res
                    .status(400)
                    .json({ message: "Invalid credentials." });
            }
        } catch (error) {
            Logger.error(error);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },

    /**
     * To refresh the existing session token if its expiration is approaching.
     * Also blacklists the old token if it is expired.
     * @param {import("express").Request} req The express request object
     * @param {import("express").Response} res The express response object
     * @returns {Promise<import("express").Response>} The express response
     * @returns 200, session JWT
     * @returns 400, message: If invalid request
     */
    refreshLoginToken: async (req, res) => {
        try {
            const oldToken = req.token;
            if (!oldToken) {
                return res
                    .status(401)
                    .json({ message: "Valid login token is required." });
            }
            let tokendata = {};
            try {
                tokendata = verify(oldToken, process.env.JWT_SECRET_KEY);
            } catch {
                return res.status(401).json({ message: "Invalid session" });
            }
            const { id, iat, pending2FA } = tokendata;
            const usr = await Mentor.findOne({
                _id: new Types.ObjectId(id),
                is_active: true,
            })
                .select("_id")
                .lean();

            if (!usr || !usr._id) {
                return res.status(401).json({
                    message: "Your account is not active or invalid.",
                });
            }
            const signAt = iat * 1000;
            if (
                signAt +
                    ms(process.env.LOGIN_VALIDITY || "1d") -
                    new Date().getTime() >=
                ms(String(process.env.LOGIN_REFRESH_UNTIL))
            ) {
                return res.json({
                    message: "Too early to refresh",
                    data: { token: oldToken },
                });
            }

            const token = req.user.getSessionToken(
                process.env.JWT_SECRET_KEY,
                process.env.LOGIN_VALIDITY || "1d",
                {
                    pending2FA,
                    ...(pending2FA ? { twoFactor: req.user.twoFactor } : {}),
                }
            );
            // await Queue.auth.blacklistToken({
            //     token: oldToken,
            //     id,
            //     expireAt: expireAt.unix(),
            // });
            return res.json({
                message: "New token",
                data: { token },
            });
        } catch (error) {
            Logger.error(error);
            return res.status(500).json({ message: "Something went wrong" });
        }
    },
    /**
     * To logout an existing session (clearing cookie only)
     * @param {import("express").Request} req The express request object
     * @param {import("express").Response} res The express response object
     * @returns {Promise<import("express").Response>} The express response
     * @returns 200, session JWT, user data
     * @returns 400, message: If any error occurs
     */
    logout: async (req, res) => {
        try {
            await redis().del(Cache.HMAP.user_session_data(req.user._id));
            return res.json({ message: "Logged out." });
        } catch (error) {
            Logger.error(error);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },

    /**
     * To generate OTP for forgot password reset request, using emailAddress and phone number
     * @param {import("express").Request} req The express request object
     * @param {import("express").Response} res The express response object
     * @returns {Promise<import("express").Response>} The express response
     * @returns 200, JWT with hashed OTP, message
     * @returns 400, message: If invalid request
     */
    handleForgotPassword: async (req, res) => {
        try {
            const { error, value } = Joi.alternatives(
                Joi.object({
                    phoneNumber: Joi.string().required().min(4).max(30),
                    countryPrefix: Joi.string()
                        .valid(...Object.values(CountryDialCode))
                        .required(),
                    otpSize: Joi.number().min(4).max(8).default(6),
                }),
                Joi.object({
                    emailAddress: Joi.email().required(),
                    otpSize: Joi.number().min(4).max(8).default(6),
                })
            ).validate({ ...req.body });
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { otpSize, emailAddress, phoneNumber, countryPrefix } = value;
            let user = null;
            let isPhone = false;
            if (phoneNumber) {
                let phone = await MentorPhone.findOne({
                    phoneNumber,
                    countryPrefix,
                    verified: true,
                })
                    .select("mentor")
                    .populate("mentor", "emailAddress is_active")
                    .lean();
                if (phone) {
                    user = phone.mentor;
                    isPhone = true;
                }
                if (user) {
                    phoneNumber = phone.phoneNumber;
                    countryPrefix = phone.countryPrefix;
                }
            } else {
                let email = await MentorEmail.findOne({
                    emailAddress,
                })
                    .select("mentor")
                    .populate("mentor", "emailAddress is_active")
                    .lean();

                if (!email) {
                    user = await Mentor.findOne({
                        emailAddress,
                    })
                        .select("emailAddress is_active")
                        .lean();
                    if (user) {
                        email = await MentorEmail.create({
                            mentor: user._id,
                            emailAddress: user.emailAddress,
                            verified: true,
                            primary: true,
                        });
                    }
                } else {
                    user = email.mentor;
                }
            }
            if (user && user.is_active) {
                otpSize = process.env.OTP_SIZE || 6;
                let { otp, token } = generateOTPToken({
                    otpSize,
                    tokenSigningKey: process.env.JWT_SECRET_KEY,
                    tokenData: {
                        emailAddress: user.emailAddress,
                    },
                });
                let message = isPhone
                    ? `A ${otpSize}-digit code has been sent to ${maskPhone(
                          phoneNumber,
                          countryPrefix
                      )} via SMS.`
                    : `A ${otpSize}-digit code has been sent to ${maskEmail(
                          emailAddress
                      )} via email.`;

                if (isPhone) {
                    Queue.mentor.sendSMSOTP({
                        phoneNumber,
                        otp,
                        countryPrefix,
                    });
                } else {
                    Queue.mentor.sendEmailOTP({ emailAddress, otp });
                }
                return res.json({
                    message,
                    data: { token },
                    ...(IS_TEST ? { _test: { otp: otp - 46 } } : {}),
                });
            } else {
                return res.status(400).json({ message: "Invalid user." });
            }
        } catch (error) {
            Logger.error(error);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },

    /**
     * To verify OTP for forgot password action, using provided hashed OTP JWT
     * @param {import("express").Request} req The express request object
     * @param {import("express").Response} res The express response object
     * @returns {Promise<import("express").Response>} The express response
     * @returns 200, forgot password JWT, message
     * @returns 400, message: If invalid request
     */
    handleVerifyForgotPasswordOTP: async (req, res) => {
        try {
            let { token, otp } = req.body;

            let tokenData = verifyOTPToken({
                otp,
                token,
                tokenSigningKey: process.env.JWT_SECRET_KEY,
                validTokenData: (data) => data.emailAddress,
            });

            if (!tokenData) {
                return res.status(400).json({
                    message: "Invalid or expired OTP.",
                });
            }
            let { emailAddress } = tokenData;

            let newToken = sign({ emailAddress }, process.env.JWT_SECRET_KEY, {
                expiresIn: 60 * 10, // 10 minutes
            });
            return res.json({
                message: "Forgot password OTP verifed.",
                data: { emailAddress, token: newToken },
            });
        } catch (error) {
            Logger.error(error);
            return res.status(400).json({ message: "Something went wrong." });
        }
    },

    send2FAOTP: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                twoFactor: Joi.string()
                    .valid(...Object.values(TwoFactorType))
                    .default(req.user.twoFactor || TwoFactorType.TOTP),
                otpSize: Joi.number().valid(4, 6).default(6),
                emailId: Joi.objectId(),
                phoneId: Joi.objectId(),
            }).validate(req.query);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { otpSize } = value;
            switch (value.twoFactor) {
                case TwoFactorType.TOTP: {
                    if (!req.user.totpKey) {
                        return res.status(403).json({
                            message: "TOTP 2FA not setup in your account.",
                        });
                    }
                    return res.status(202).json({
                        message:
                            "Provide the otp from your linked device authenticator",
                    });
                }
                case TwoFactorType.SMS: {
                    let phone = await MentorPhone.findOne({
                        ...(value.phoneId
                            ? { _id: value.phoneId }
                            : { primary: true }),
                        mentor: req.user._id,
                        verified: true,
                    });
                    if (!phone) {
                        return res.status(403).json({
                            message: "Phone number not linked to your account.",
                        });
                    }
                    let { otp, token } = generateOTPToken({
                        otpSize,
                        tokenSigningKey: process.env.JWT_SECRET_KEY,
                        tokenData: {
                            user: req.user._id,
                            phoneNumber: phone.phoneNumber,
                            countryPrefix: phone.countryPrefix,
                        },
                    });
                    Queue.mentor.sendSMSOTP({
                        phoneNumber: phone.phoneNumber,
                        countryPrefix: phone.countryPrefix,
                        otp,
                    });
                    return res.status(202).json({
                        message: `A ${otpSize}-digit code has been sent to ${maskPhone(
                            phone.phoneNumber,
                            phone.countryPrefix
                        )} via SMS.`,
                        data: { token },
                        ...(IS_TEST ? { _test: { otp: otp - 46 } } : {}),
                    });
                }
                default: {
                    let email = await MentorEmail.findOne({
                        ...(value.emailId
                            ? { _id: value.emailId }
                            : { primary: true }),
                        mentor: req.user._id,
                        verified: true,
                    });
                    if (!email && value.emailId) {
                        return res.status(403).json({
                            message:
                                "Email address not linked to your account.",
                        });
                    }
                    if (!email) {
                        email = {
                            emailAddress: req.user.emailAddress,
                        };
                    }
                    let { otp, token } = generateOTPToken({
                        otpSize,
                        tokenSigningKey: process.env.JWT_SECRET_KEY,
                        tokenData: {
                            user: req.user._id,
                            emailAddress: email.emailAddress,
                        },
                    });
                    Queue.mentor.sendEmailOTP({
                        emailAddress: email.emailAddress,
                        otp,
                    });
                    return res.status(202).json({
                        message: `A ${otpSize}-digit code has been sent to ${maskEmail(
                            email.emailAddress
                        )} via email.`,
                        data: { token },
                        ...(IS_TEST ? { _test: { otp: otp - 46 } } : {}),
                    });
                }
            }
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    verify2FAOTP: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                otp: Joi.numstring().required(),
                token: Joi.string(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { otp, token } = value;
            if (token) {
                if (
                    !verifyOTPToken({
                        otp,
                        token,
                        tokenSigningKey: process.env.JWT_SECRET_KEY,
                        validTokenData: (data) =>
                            String(data.user) == String(req.user._id),
                    })
                ) {
                    return res
                        .status(403)
                        .json({ message: "Invalid otp or token" });
                }
            } else if (req.user.totpKey) {
                let verified = authenticator
                    .create({
                        ...authenticator.allOptions(),
                        ...{},
                    })
                    .verify({ token: String(otp), secret: req.user.totpKey });
                if (!verified) {
                    return res.status(403).json({ message: "Invalid otp" });
                }
            } else {
                return res.status(400).json({ message: "Invalid request" });
            }
            const jwtToken = req.user.getSessionToken(
                process.env.JWT_SECRET_KEY,
                process.env.LOGIN_VALIDITY || "1d",
                {
                    pending2FA: false,
                }
            );
            return res.json({
                message: "Verified successfully",
                data: { token: jwtToken },
            });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    sendNewPhoneOTP: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                phoneNumber: Joi.string().required(),
                countryPrefix: Joi.string().required(),
                otpSize: Joi.number().valid(4, 6).default(6),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { phoneNumber, countryPrefix, otpSize } = value;
            let phone = await MentorPhone.findOne({
                phoneNumber,
                countryPrefix,
                verified: true,
            });
            if (phone) {
                return res
                    .status(403)
                    .json({ message: "Phone number is already in use" });
            }
            let { otp, token } = generateOTPToken({
                otpSize,
                tokenData: {
                    user: req.user._id,
                    phoneNumber,
                    countryPrefix,
                },
            });
            Queue.mentor.sendSMSOTP({ phoneNumber, otp, countryPrefix });
            return res.status(202).json({
                message: `A ${otpSize}-digit code has been sent to ${maskPhone(
                    phoneNumber,
                    countryPrefix
                )} via SMS.`,
                data: { token },
                ...(IS_TEST ? { _test: { otp: otp - 46 } } : {}),
            });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    verifyNewPhoneOTP: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                otp: Joi.numstring().required(),
                token: Joi.string().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { otp, token } = value;
            let verified = verifyOTPToken({
                otp,
                token,
                validTokenData: (data) =>
                    String(data.user) == String(req.user._id),
            });
            if (!verified) {
                return res.status(400).send({
                    message: "Invalid or expired OTP.",
                });
            }
            let exists = await MentorPhone.countDocuments({
                phoneNumber: verified.phoneNumber,
                countryPrefix: verified.countryPrefix,
                verified: true,
            });
            if (exists) {
                return res
                    .status(403)
                    .json({ message: "Phone number already in use" });
            }
            let newPhone = await MentorPhone.create({
                mentor: req.user._id,
                phoneNumber: verified.phoneNumber,
                countryPrefix: verified.countryPrefix,
                verified: true,
                primary: false,
            });
            if (newPhone) {
                let hasPrimary = await MentorPhone.countDocuments({
                    mentor: req.user._id,
                    verified: true,
                    primary: true,
                });
                if (!hasPrimary) {
                    await MentorPhone.findOneAndUpdate(
                        { _id: newPhone._id },
                        { $set: { primary: true } }
                    );
                    newPhone.primary = true;
                }
            }
            return res.status(201).json({
                message: "New phone number verified.",
                data: { phone: newPhone },
            });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    makePhonePrimary: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                phoneId: Joi.objectId().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let done = await MentorPhone.findOneAndUpdate(
                {
                    _id: value.phoneId,
                    mentor: req.user._id,
                    primary: false,
                    verified: true,
                },
                { $set: { primary: true } }
            );
            if (!done) {
                return res.status(403).json({ message: "Invalid request" });
            }
            await MentorPhone.updateMany(
                {
                    _id: { $ne: value.phoneId },
                    mentor: req.user._id,
                },
                { $set: { primary: false } }
            );
            return res.status(205).json({ message: "Primary phone changed" });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    deletePhone: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                phoneId: Joi.objectId().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let deleted = await MentorPhone.findOneAndDelete({
                _id: value.phoneId,
                mentor: req.user._id,
                primary: false,
            });
            if (!deleted) {
                return res.status(403).json({ message: "Invalid request" });
            }
            return res.json({ data: { deleted } });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    sendNewEmailOTP: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                emailAddress: Joi.email().required(),
                otpSize: Joi.number().valid(4, 6).default(6),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { emailAddress, otpSize } = value;
            let email = await MentorEmail.findOne({
                emailAddress,
                verified: true,
            });
            if (email) {
                return res
                    .status(403)
                    .json({ message: "Email address is already in use" });
            }
            let { otp, token } = generateOTPToken({
                otpSize,
                tokenData: {
                    user: req.user._id,
                    emailAddress,
                },
            });

            Queue.mentor.sendEmailOTP({ emailAddress, otp });
            return res.status(202).json({
                message: `A ${otpSize}-digit code has been sent to ${maskEmail(
                    emailAddress
                )} via email.`,
                data: { token },
                ...(IS_TEST ? { _test: { otp: otp - 46 } } : {}),
            });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    verifyNewEmailOTP: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                otp: Joi.numstring().required(),
                token: Joi.string().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { otp, token } = value;
            let verified = verifyOTPToken({
                otp,
                token,
                validTokenData: (data) =>
                    String(data.user) == String(req.user._id),
            });

            if (!verified) {
                return res.status(400).send({
                    message: "Invalid or expired OTP.",
                });
            }
            let exists = await MentorEmail.countDocuments({
                emailAddress: verified.emailAddress,
                verified: true,
            });
            if (exists) {
                return res
                    .status(403)
                    .json({ message: "Email address already in use" });
            }
            let newEmail = await MentorEmail.create({
                mentor: req.user._id,
                emailAddress: verified.emailAddress,
                verified: true,
                primary: false,
            });
            if (newEmail) {
                let hasPrimary = await MentorEmail.countDocuments({
                    mentor: req.user._id,
                    verified: true,
                    primary: true,
                });
                if (!hasPrimary) {
                    await MentorEmail.findOneAndUpdate(
                        { _id: newEmail._id },
                        { $set: { primary: true } }
                    );
                    newEmail.primary = true;
                    Mentor.findOneAndUpdate(
                        { _id: req.user._id },
                        {
                            $set: {
                                emailAddress: newEmail.emailAddress,
                            },
                        }
                    );
                    //   await Queue.user.refreshUser({ userId: req.user._id });
                }
            }
            return res.status(201).json({
                message: "New email address verified.",
                data: { email: newEmail },
            });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    makeEmailPrimary: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                emailId: Joi.objectId().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let done = await MentorEmail.findOneAndUpdate(
                {
                    _id: value.emailId,
                    mentor: req.user._id,
                    primary: false,
                    verified: true,
                },
                { $set: { primary: true } }
            );
            if (!done) {
                return res.status(403).json({ message: "Invalid request" });
            }
            await MentorEmail.updateMany(
                {
                    _id: { $ne: value.emailId },
                    mentor: req.user._id,
                },
                { $set: { primary: false } }
            );
            await Mentor.findOneAndUpdate(
                { _id: req.user._id },
                {
                    $set: {
                        emailAddress: done.emailAddress,
                    },
                }
            );
            return res.status(205).json({ message: "Primary email changed" });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    deleteEmail: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                emailId: Joi.objectId().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let done = await MentorEmail.findOneAndDelete({
                _id: value.emailId,
                mentor: req.user._id,
                primary: false,
            });
            if (!done) {
                return res.status(403).json({ message: "Invalid request" });
            }
            return res.json({ data: { deleted: done } });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    turnOn2FA: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                twoFactor: Joi.string()
                    .valid(...Object.values(TwoFactorType))
                    .default(TwoFactorType.TOTP),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            if (value.twoFactor == TwoFactorType.TOTP) {
                if (!req.user.totpKey) {
                    return res.status(403).json({
                        message: "TOTP 2FA not setup in your account.",
                    });
                }
            } else if (value.twoFactor == TwoFactorType.EMAIL) {
                let exists = await MentorEmail.countDocuments({
                    mentor: req.user._id,
                    verified: true,
                });
                if (!exists) {
                    return res.status(403).json({
                        message: "Please link an email address first.",
                    });
                }
            }
            let $set = { twoFactor: value.twoFactor };
            let done = await Mentor.findOneAndUpdate(
                { _id: req.user._id },
                {
                    $set,
                }
            );
            if (!done) throw Error({ user: req.user._id });
            await redis().del(
                Cache.HMAP.user_session_data(done._id),
                Cache.HMAP.user_data(done._id)
            );
            // await Queue.user.refreshUser({ userId: done._id });
            return res
                .status(201)
                .json({ message: "Two factor authentication enabled" });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    turnOff2FA: async (req, res) => {
        try {
            let $set = { twoFactor: TwoFactorType.NONE };
            let done = await Mentor.findOneAndUpdate(
                { _id: req.user._id },
                {
                    $set: { ...$set, totpKey: "" },
                }
            );
            if (!done) throw Error({ user: req.user._id });
            await redis().del(
                Cache.HMAP.user_session_data(done._id),
                Cache.HMAP.user_data(done._id)
            );
            // await Queue.user.refreshUser({ userId: req.user._id });

            return res.json({ message: "Two factor authentication disabled" });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    generateTotpKey: async (req, res) => {
        try {
            if (req.user.totpKey) {
                return res
                    .status(403)
                    .json({ message: "TOTP key already exists" });
            }

            const secret = authenticator.generateSecret();
            const otpauth = authenticator.keyuri(
                req.user.emailAddress,
                process.env.APP_NAME || "Payr Mentor",
                secret
            );
            const qr = await qrcode.toDataURL(otpauth);
            let token = sign(
                {
                    user: req.user._id,
                    secret,
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn: 60 * 5, // 5 minutes
                }
            );
            return res
                .status(201)
                .json({ data: { qrcode: qr, otpauth, secret, token } });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    verifyTotpToken: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                otp: Joi.numstring().required(),
                token: Joi.string(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { otp, token } = value;
            let secret = null;
            if (req.user.totpKey) {
                secret = req.user.totpKey;
            } else if (token) {
                try {
                    let tokenData = verify(token, process.env.JWT_SECRET_KEY);
                    if (String(tokenData.user) == String(req.user._id)) {
                        secret = tokenData.secret;
                    }
                } catch (err) {
                    return res.status(400).json({
                        message: "Invalid or expired token.",
                    });
                }
            }
            if (!secret) {
                return res
                    .status(403)
                    .json({ message: "TOTP 2FA not setup in your account." });
            }
            let verified = authenticator
                .create({
                    ...authenticator.allOptions(),
                    ...{},
                })
                .verify({ token: String(otp), secret });
            if (!verified) {
                return res
                    .status(403)
                    .json({ message: "Invalid otp or token" });
            }
            if (!req.user.totpKey) {
                let $set = { twoFactor: TwoFactorType.TOTP };
                let done = await Mentor.findOneAndUpdate(
                    { _id: req.user._id },
                    { $set: { totpKey: secret, ...$set } }
                );
                if (!done) throw Error({ user: req.user._id });
                await redis().del(
                    Cache.HMAP.user_session_data(done._id),
                    Cache.HMAP.user_data(done._id)
                );
                // await Queue.user.refreshUser({ userId: req.user._id });
                return res
                    .status(201)
                    .json({ message: "Verified successfully" });
            } else {
                const jwtToken = req.user.getSessionToken(
                    process.env.JWT_SECRET_KEY,
                    process.env.LOGIN_VALIDITY || "1d",
                    {
                        pending2FA: false,
                    }
                );
                return res.json({
                    message: "Verified successfully",
                    data: { token: jwtToken },
                });
            }
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    deleteTotpKey: async (req, res) => {
        try {
            if (!req.user.totpKey) {
                return res.status(403).json({ message: "TOTP 2FA not setup" });
            }
            let done = await Mentor.findOneAndUpdate(
                { _id: req.user._id },
                { $set: { totpKey: "", twoFactor: TwoFactorType.EMAIL } }
            );
            if (!done) throw Error({ user: req.user._id });
            await redis().del(
                Cache.HMAP.user_session_data(done._id),
                Cache.HMAP.user_data(done._id)
            );
            // await Queue.user.refreshUser({ userId: req.user._id });

            return res.json({ message: "Deleted TOTP key" });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
    changePassword: async (req, res) => {
        try {
            let { error, value } = Joi.object({
                oldpassword: Joi.string().required(),
                newpassword: Joi.password().required(),
            }).validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.message });
            }
            let { oldpassword, newpassword } = value;
            let user = await Mentor.findOne({
                _id: req.user._id,
                is_active: true,
            });
            if (!user) return res.status(404).json({ message: "Invalid user" });
            if (!user.authenticate(oldpassword))
                return res.status(403).json({ message: "Wrong password" });
            if (oldpassword == newpassword)
                return res.status(406).json({
                    message: "New password should be different from old one",
                });
            user.password = newpassword;
            await user.save();
            // await Queue.auth.passwordChanged({ ussrId: req.user._id });
            return res.json({ message: "Password changed" });
        } catch (e) {
            Logger.error(e);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },
};
