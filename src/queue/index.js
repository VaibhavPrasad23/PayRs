const { Queue } = require("bullmq");
const QUEUE = require("./names");
const { Logger } = require("../../config/logger");

let mentorQueue;

module.exports = {
    register: (config) => {
        mentorQueue = new Queue(QUEUE.MENTOR.name, {
            ...config,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: 50,
            },
        });
        mentorQueue.on("waiting", (job) => {
            Logger.debug(job);
        });
        return {
            mentorQueue,
        };
    },
    mentor: {
        sendSMSOTP: async ({
            otp,
            phoneNumber,
            countryPrefix,
            options = {},
        }) => {
            return await mentorQueue.add(
                QUEUE.MENTOR.SMS_OTP,
                {
                    otp,
                    phoneNumber,
                    countryPrefix,
                },
                options
            );
        },
        sendEmailOTP: async ({ otp, emailAddress, options = {} }) => {
            return await mentorQueue.add(
                QUEUE.MENTOR.EMAIL_OTP,
                {
                    otp,
                    emailAddress,
                },
                options
            );
        },
    },
};
