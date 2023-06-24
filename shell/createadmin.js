const { Mentor, MentorEmail } = require("@payr/schemata");
const inquirer = require("inquirer");
const Joi = require("../src/utils/joi");
const { Logger } = require("../config/logger");

inquirer.registerPrompt("date", require("inquirer-date-prompt"));

module.exports = () => {
    const self = () =>
        inquirer
            .prompt([
                {
                    name: "emailAddress",
                    message: "Email address",
                    validate: async (v) => {
                        let msg = Joi.email().validate(v).error;
                        if (!msg) {
                            let d = await MentorEmail.countDocuments({
                                emailAddress: v,
                            });
                            msg = d != 0 ? "Email already in use." : true;
                        }
                        return msg;
                    },
                },
                {
                    name: "fullName",
                    message: "Full name",
                    validate: (v) =>
                        Joi.string().required().validate(v).error || true,
                },
                {
                    type: "password",
                    name: "password",
                    message: "Password",
                    validate: (password) =>
                        Joi.password().validate(password).error || true,
                },
                {
                    type: "password",
                    name: "cpassword",
                    message: "Confirm password",
                    validate: (v) =>
                        Joi.string().required().validate(v).error || true,
                },
                {
                    type: "date",
                    name: "dob",
                    message: "DOB",
                    default: "",
                    locale: "en",
                },
                {
                    name: "userImage",
                    message: "Image url",
                    default: "",
                },
                {
                    name: "is_admin",
                    type: "confirm",
                    message: "Is admin?",
                    default: false,
                },
                {
                    name: "confirm",
                    type: "confirm",
                    message: "Confirm?",
                    default: false,
                },
            ])
            .then(async (ans) => {
                ans.dob = ans.dob.toISOString();
                if (ans.cpassword != ans.password) {
                    Logger.error("Passwords do not match.");
                    return self();
                }
                if (!ans.confirm) {
                    Logger.info("Aborted.");
                    return process.exit(0);
                }
                delete ans.cpassword;
                const mentor = await Mentor.create(ans);
                await MentorEmail.create({
                    emailAddress: ans.emailAddress,
                    mentor,
                    primary: true,
                    verified: true,
                });
                Logger.info("Mentor created:", mentor._id);
                return process.exit(0);
            });
    return self();
};
