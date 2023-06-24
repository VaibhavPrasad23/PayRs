const { MentorEmail } = require("@payr/schemata");
const inquirer = require("inquirer");
const Joi = require("../src/utils/joi");
const { Logger } = require("../config/logger");

inquirer.registerPrompt("date", require("inquirer-date-prompt"));

module.exports = () => {
    let n = 2;
    const self = () =>
        inquirer
            .prompt([
                {
                    name: "emailAddress",
                    message: "Email address",
                    validate: async (v) => {
                        let msg = Joi.string().email().validate(v).error;
                        if (!msg) {
                            const mentorEmail = await MentorEmail.findOne({
                                emailAddress: v,
                            }).populate(
                                "mentor",
                                "_id fullName emailAddress is_admin is_active suspended"
                            );
                            if (!mentorEmail) {
                                return "Account not found.";
                            }
                            const { mentor } = mentorEmail;
                            if (!mentor.is_active) {
                                return "Inactive account";
                            }
                            if (mentor.suspended) {
                                return "Suspended account";
                            }
                            msg = true;
                        }
                        return msg;
                    },
                },
                {
                    type: "password",
                    name: "password",
                    message: "Password",
                    validate: (password) =>
                        Joi.string().required().validate(password).error ||
                        true,
                },
                {
                    type: "password",
                    name: "signingKey",
                    message: "Signing key",
                    default: process.env.JWT_SECRET_KEY,
                },
                {
                    name: "expiresIn",
                    message: "Expires In",
                    default: process.env.LOGIN_VALIDITY,
                    validate: (ein) =>
                        Joi.string().required().validate(ein).error || true,
                },
            ])
            .then(async (ans) => {
                const mentorEmail = await MentorEmail.findOne({
                    emailAddress: ans.emailAddress,
                }).populate(
                    "mentor",
                    "_id fullName emailAddress is_admin is_active suspended hashed_password"
                );
                const { mentor } = mentorEmail;

                if (!mentor.authenticate(ans.password)) {
                    Logger.error(`Invalid credentials. ${n} attempts left.`);
                    if (n <= 0) {
                        Logger.error(
                            "Bad credentials attempt blocked. Sent alert to the administrator."
                        );
                        process.exit(1);
                    }
                    n--;
                    return self();
                }
                Logger.info("Session token generated for", mentor._id);
                console.log(
                    "TOKEN: ",
                    mentor.getSessionToken(ans.signingKey, ans.expiresIn, {
                        pending2FA: mentor.twoFactor ? true : false,
                        ...(mentor.twoFactor
                            ? { twoFactor: mentor.twoFactor }
                            : {}),
                    })
                );
                return process.exit(0);
            });
    return self();
};
