const router = require("express").Router();
const { authenticate } = require("../../../middlewares");
const rateLimit = require("../../../middlewares/ratelimit");

const auth = require("../controller/auth");

const {
    v1: { AUTH },
} = require("../../endpoints");

router.post(AUTH.LOGIN, rateLimit.limitPasswordLogin, auth.loginWithPassword);

router.get(AUTH.ROOT, authenticate({}), auth.sessionData);

router.get(
    AUTH.REFRESH_LOGIN,
    authenticate({ allowWithout2FA: true }),
    auth.refreshLoginToken
);
router.get(AUTH.LOGOUT, auth.logout);

router.post(
    AUTH.FORGOT_PASSWORD,
    rateLimit.limitSendOTP,
    auth.handleForgotPassword
);

router.post(AUTH.VERIFY_FORGOT_PASSWORD, auth.handleVerifyForgotPasswordOTP);

router.post(
    AUTH.PHONE,
    rateLimit.limitSendOTP,
    authenticate({}),
    auth.sendNewPhoneOTP
);
router.put(AUTH.PHONE, authenticate({}), auth.verifyNewPhoneOTP);
router.patch(AUTH.PHONE, authenticate({}), auth.makePhonePrimary);
router.delete(AUTH.PHONE, authenticate({}), auth.deletePhone);

router.post(
    AUTH.EMAIL,
    rateLimit.limitSendOTP,
    authenticate({}),
    auth.sendNewEmailOTP
);
router.put(AUTH.EMAIL, authenticate({}), auth.verifyNewEmailOTP);
router.patch(AUTH.EMAIL, authenticate({}), auth.makeEmailPrimary);
router.delete(AUTH.EMAIL, authenticate({}), auth.deleteEmail);

router.get(AUTH.TOTP, authenticate({}), auth.generateTotpKey);
router.post(
    AUTH.TOTP,
    authenticate({ allowWithout2FA: true }),
    auth.verifyTotpToken
);
router.delete(AUTH.TOTP, authenticate({}), auth.deleteTotpKey);

router.get(
    AUTH.TWOFA,
    authenticate({ allowWithout2FA: true }),
    auth.send2FAOTP
);
router.post(
    AUTH.TWOFA,
    authenticate({ allowWithout2FA: true }),
    auth.verify2FAOTP
);
router.put(AUTH.TWOFA, authenticate({}), auth.turnOn2FA);
router.delete(AUTH.TWOFA, authenticate({}), auth.turnOff2FA);

router.patch(AUTH.PASSWORD, authenticate({}), auth.changePassword);

module.exports = router;
