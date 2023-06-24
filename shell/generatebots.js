const { Mentor, MentorEmail } = require("@payr/schemata");
const inquirer = require("inquirer");
const Joi = require("../src/utils/joi");
const { Logger } = require("../config/logger");
const { randomUserData } = require("../test/utils/mockdata");
inquirer.registerPrompt("date", require("inquirer-date-prompt"));

module.exports = () => {
    const self = () =>
        inquirer
            .prompt([
                {
                    name: "total",
                    message: "Total mentor bots",
                    validate: (v) =>
                        Joi.number().required().min(0).max(100).validate(v)
                            .error || true,
                },
                {
                    name: "confirm",
                    type: "confirm",
                    message: "Confirm?",
                    default: false,
                },
            ])
            .then(async (ans) => {
                if (!ans.confirm) {
                    Logger.info("Aborted.");
                    return process.exit(0);
                }
                let mentors = randomUserData(ans.total);
                mentors = await Mentor.insertMany(mentors);
                await MentorEmail.insertMany(
                    mentors.map((m) => ({
                        emailAddress: m.emailAddress,
                        mentor: m._id,
                        primary: true,
                        verified: true,
                    }))
                );
                Logger.info("Random mentors created:", mentors.length);
                return process.exit(0);
            });
    return self();
};
