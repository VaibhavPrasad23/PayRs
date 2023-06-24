const { compareSync, hashSync } = require("bcrypt");
const { verify, sign } = require("jsonwebtoken");
const { Logger } = require("../../../../config/logger");

module.exports = {
    /**
     * Generates a random OTP (6 digit by default) and its corresponding jwt containing encryptedOtp (literally).
     * @param {Object} data
     * @param {Number} data.otpSize The size of otp, defaults to 6.
     * @param {Number} data.expiresIn The validity of jwt. Defaults to 300 secs.
     * @param {String} data.tokenSigningKey The key to be used to sign the jwt. Defaults to the value of process.env.JWT_SECRET_KEY
     * @param {Object} data.tokenData The additional data to be stored in jwt along with the encryptedOtp.
     * @returns {Object} { otp, token }
     */
    generateOTPToken: ({
        otpSize = 6,
        tokenSigningKey = process.env.JWT_SECRET_KEY,
        expiresIn = 60 * 5,
        tokenData = {},
    }) => {
        let otp = Math.random().toString().slice(-otpSize);
        Logger.debug(otp);
        let encryptedOtp = hashSync(otp, 8);
        let token = sign(
            {
                encryptedOtp,
                ...tokenData,
            },
            tokenSigningKey,
            {
                expiresIn,
            }
        );
        return { otp, token };
    },

    /**
     * Verifies an otp-token pair to check if token (jwt) is valid and it contains the hashed form of the given otp as encryptedOtp.
     * @param {Object} data
     * @param {Number} otp
     * @param {String} data.token The jwt token containing the encryptedOtp (literally)
     * @param {Function} data.validTokenData Provided with decoded jwt data, should return true if dsta is proper after your custom check. Returns true by default (if encryptedOtp is present in data)
     * @param {String} data.tokenSigningKey The key which is expected to be used to sign the given token. Defaults to the value of process.env.JWT_SECRET_KEY.
     * @returns {Boolean}
     */
    verifyOTPToken: ({
        otp,
        token,
        validTokenData = (tokenData) => (tokenData.encryptedOtp ? true : false),
        tokenSigningKey = process.env.JWT_SECRET_KEY,
    }) => {
        try {
            let tokenData = verify(token, tokenSigningKey);
            let { encryptedOtp } = tokenData;

            if (!encryptedOtp) {
                return false;
            }
            if (!validTokenData(tokenData)) {
                return false;
            }
            if (!compareSync(String(otp), encryptedOtp)) {
                return false;
            }
            return tokenData;
        } catch {
            return false;
        }
    },

    maskEmail: (email, maskDomainToo = false, maskWith = "*") => {
        let [mail, domain] = email.split("@");
        mail = mail
            .split("")
            .map((m, i) => (i < (mail.length < 3 ? 1 : 3) ? m : maskWith))
            .join("");
        if (maskDomainToo) {
            let dom = domain
                .split(".")[0]
                .split("")
                .map((m, i) => (i < (mail.length < 3 ? 1 : 3) ? m : maskWith))
                .join("");
            domain = domain.replace(domain.split(".")[0], dom);
        }
        return `${mail}@${domain}`;
    },
    maskPhone: (phone, countryPrefix = "", maskWith = "*") =>
        (
            countryPrefix +
            " " +
            phone
                .split("")
                .map((m, i) =>
                    i < (phone.length < 4 ? 1 : 2) || i > phone.length - 3
                        ? m
                        : maskWith
                )
                .join("")
        ).trim(),
};
