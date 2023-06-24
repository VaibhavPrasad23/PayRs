const Joi = require("joi");
const { Types, isValidObjectId } = require("mongoose");
const { CountryDialCode } = require("@payr/schemata");

module.exports = {
    ...Joi,
    /**
     * @returns {import("joi").Schema} Object ID Schema
     */
    objectId: () =>
        Joi.custom((val, helper) => {
            try {
                if (isValidObjectId(String(val))) {
                    return new Types.ObjectId(val);
                }
                return helper.error("any.custom");
            } catch {
                return helper.error("any.custom");
            }
        }).messages({ "any.custom": "Invalid ObjectId" }),
    json: () =>
        Joi.custom((val, helper) => {
            try {
                return JSON.parse(val);
            } catch {
                return helper.error("any.custom");
            }
        }).messages({ "any.custom": "Invalid stringified json" }),
    hashtag: () =>
        Joi.string()
            .custom((val, helper) => {
                val = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
                if (!val.length) return helper.error("any.custom");
                return val;
            })
            .messages({ "any.custom": "Invalid hashtag" }),
    nickname: () =>
        Joi.string()
            .custom((val, helper) => {
                val = val.toLowerCase().replace(/[^a-z0-9_\-.@]/g, "");
                if (!val.length) return helper.error("any.custom");
                return val;
            })
            .messages({ "any.custom": "Invalid nickname/username" }),

    password: () =>
        Joi.string()
            .pattern(
                new RegExp(
                    /^(?=.*\d)(?=.*[!@#$%^&*.?])(?=.*[a-z])(?=.*[0-9])(?=.*[A-Z])^/
                )
            )
            .min(8)
            .max(64)
            .messages({
                "string.pattern.base": `Password must be between 8 to 64 letters and contains atleast one uppercase, lowercase, digit and special character.`,
                "string.empty": `Password cannot be empty.`,
                "string.min": `Password must be at least 8 characters`,
                "string.max": `Password must be at most 64 characters`,
            }),
    countryCode: () => Joi.string().valid(...Object.values(CountryDialCode)),
    numstring: () =>
        Joi.custom((val, helper) => {
            if (isNaN(val)) return helper.error("any.custom");
            return val;
        }).messages({ "any.custom": "Invalid number" }),
    email: () =>
        Joi.string()
            .email()
            .custom((v, helper) => {
                let part = v.split("@")[0];
                if (part.includes("+")) {
                    return helper.error("any.custom");
                }
                return v.toLowerCase();
            })
            .messages({ "any.custom": "Invalid email address" }),
};
