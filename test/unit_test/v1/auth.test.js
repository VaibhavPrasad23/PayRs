require("../../init");
const { expect } = require("chai");
const request = require("supertest");
const dbHandler = require("../../utils/db");
const app = require("../../../src/app");
const { authAgent } = require("../../utils/auth");
const { setApiResponse, writeApiDoc } = require("../../utils/docwriter");
const { authenticator } = require("otplib");

const jwt = require("jsonwebtoken");
const { Types } = require("mongoose");
const {
    randomString,
    randomAdminData,
    randomUserNotificationData,
    randomDisapproveTopics,
    randomUserSignupData,
    randomUserData,
    mockBinaryImageData,
    randomNumString,
    randomEmail,
    randomPhoneData,
    randomEmailData,
} = require("../../utils/mockdata");

const {
    Mentor,
    MentorPhone,
    MentorEmail,
    CountryDialCode: COUNTRY_DIAL_CODE,
    TwoFactorType,
} = require("@payr/schemata");

let headers = { "x-payr-app-key": process.env.X_PAYR_APP_KEY };

let agent = request.agent(app);

agent.set(headers);

let agentAuth = request.agent(app);
agentAuth.set(headers);

let agentMod = request.agent(app);
agentMod.set(headers);

let authUser = null;

const {
    v1: { AUTH, SELF: ROOT },
} = require("../../../src/api/endpoints");
const { bearerAuthHeader } = require("../../../src/utils");

beforeAll(async () => {
    await dbHandler.connectInitDatabase();
    const data = await authAgent(agentAuth, true);
    agentAuth = data.agent;
    authUser = data.user;

    await MentorPhone.insertMany(
        randomPhoneData({ limit: 5, userIDs: authUser._id })
    );
    await MentorEmail.insertMany(
        randomEmailData({ limit: 5, userIDs: authUser._id })
    );
});

afterAll(async () => {
    await dbHandler.clearDropDisconnectDatabase();
    writeApiDoc();
});

const authPath = (endpoint = "") => `${ROOT}${AUTH.SELF}${endpoint}`;

describe(`Auth`, () => {
    describe(`POST ${authPath(AUTH.LOGIN)}`, () => {
        test("Return error on invalid credentials", (done) => {
            // let user = await Mentor.create(randomUserData());
            agent
                .post(authPath(AUTH.PASSWORD_LOGIN))
                .send({ emailAddress: "" })
                .expect(400)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let body = { emailAddress: randomString({ length: 25 }) };
                    agent
                        .post(authPath(AUTH.PASSWORD_LOGIN))
                        .send(body)
                        .expect(400)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            agent
                                .post(authPath(AUTH.PASSWORD_LOGIN))
                                .send({
                                    emailAddress: randomString({}),
                                    password: "",
                                })
                                .expect(400)
                                .end(async (err, res) => {
                                    if (err)
                                        return done({
                                            body: res.body,
                                            _data: res.request._data,
                                            err,
                                        });
                                    agent
                                        .post(authPath(AUTH.PASSWORD_LOGIN))
                                        .send({
                                            emailAddress: randomString({}),
                                            password: randomString({
                                                length: 100,
                                            }),
                                        })
                                        .expect(400)
                                        .end(async (err, res) => {
                                            if (err)
                                                return done({
                                                    body: res.body,
                                                    err,
                                                });
                                            agent
                                                .post(
                                                    authPath(
                                                        AUTH.PASSWORD_LOGIN
                                                    )
                                                )
                                                .send({
                                                    emailAddress: randomString(
                                                        {}
                                                    ),
                                                    password:
                                                        "testPassword@123",
                                                })
                                                .expect(400)
                                                .end(async (err, res) => {
                                                    if (err)
                                                        return done({
                                                            body: res.body,
                                                            err,
                                                        });
                                                    let { message } = res.body;
                                                    expect(message).to.be.not
                                                        .null;
                                                    let body = {
                                                        emailAddress:
                                                            authUser.emailAddress,
                                                        password: randomString({
                                                            length: 25,
                                                        }),
                                                    };
                                                    agent
                                                        .post(
                                                            authPath(
                                                                AUTH.PASSWORD_LOGIN
                                                            )
                                                        )
                                                        .send(body)
                                                        .expect(400)
                                                        .end(
                                                            async (
                                                                err,
                                                                res
                                                            ) => {
                                                                if (err)
                                                                    return done(
                                                                        {
                                                                            body: res.body,
                                                                            err,
                                                                        }
                                                                    );
                                                                let {
                                                                    message,
                                                                } = res.body;
                                                                expect(message)
                                                                    .to.be.not
                                                                    .null;
                                                                setApiResponse({
                                                                    response:
                                                                        res,
                                                                    body,
                                                                });
                                                                done();
                                                            }
                                                        );
                                                });
                                        });
                                });
                        });
                });
        });
        test("Login using existing email and password", (done) => {
            let body = {
                emailAddress: authUser.emailAddress,
                password: authUser.password,
            };
            agent
                .post(authPath(AUTH.PASSWORD_LOGIN))
                .send(body)
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    setApiResponse({ response: res, body });

                    done();
                });
        });
    });
    describe(`GET ${authPath()}`, () => {
        test("Get currently logged in user data", (done) => {
            agentAuth
                .get(authPath())
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data).to.be.not.null;
                    setApiResponse({ response: res });

                    done();
                });
        });
    });
    describe(`POST ${authPath(AUTH.FORGOT_PASSWORD)}`, () => {
        test("error on invalid emailAddress for forgot password", (done) => {
            agent
                .post(authPath(AUTH.FORGOT_PASSWORD))
                .send({ emailAddress: "" })
                .expect(400)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    agent
                        .post(authPath(AUTH.FORGOT_PASSWORD))
                        .send({
                            emailAddress: randomNumString(90),
                        })
                        .expect(400)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            let body = {
                                emailAddress: randomNumString(),
                            };
                            agent
                                .post(authPath(AUTH.FORGOT_PASSWORD))
                                .send(body)
                                .expect(400)
                                .end(async (err, res) => {
                                    if (err)
                                        return done({
                                            body: res.body,
                                            _data: res.request._data,
                                            err,
                                        });
                                    setApiResponse({
                                        response: res,
                                        body,
                                    });

                                    done();
                                });
                        });
                });
        });
        test("Generate token to reset forgot password (using phone or email)", (done) => {
            let body = {
                emailAddress: authUser.emailAddress,
            };
            agent
                .post(authPath(AUTH.FORGOT_PASSWORD))
                .send(body)
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    setApiResponse({ response: res, body });
                    done();
                });
        });
    });
    describe(`POST ${authPath(AUTH.VERIFY_FORGOT_PASSWORD)}`, () => {
        test("Verify forgot password verification otp", (done) => {
            agent
                .post(authPath(AUTH.FORGOT_PASSWORD))
                .send({
                    emailAddress: authUser.emailAddress,
                    otpSize: 6,
                })
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    let body = {
                        token: data.token,
                        otp: res.body._test.otp + 46,
                    };
                    agent
                        .post(authPath(AUTH.VERIFY_FORGOT_PASSWORD))
                        .send(body)
                        .expect(200)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            //				console.log(res); return done();
                            let { data } = res.body;
                            expect(data.token).to.be.not.null;
                            setApiResponse({ response: res, body });
                            done();
                        });
                });
        });
    });
    describe(`GET ${authPath(AUTH.REFRESH_LOGIN_TOKEN)}`, () => {
        test("should return error when no token present in headers.", (done) => {
            agent
                .get(authPath(AUTH.REFRESH_LOGIN_TOKEN))
                .expect(401)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    agent
                        .set({
                            Authorization: bearerAuthHeader(randomString({})),
                        })
                        .get(authPath(AUTH.REFRESH_LOGIN_TOKEN))
                        .expect(401)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            let expiredToken = jwt.sign(
                                {
                                    emailAddress: authUser.emailAddress,
                                    id: authUser._id,
                                    countryPrefix: authUser.countryPrefix,
                                },
                                process.env.JWT_SECRET_KEY,
                                {
                                    expiresIn: 0, //* 0 seconds
                                }
                            );
                            agent
                                .set({
                                    Authorization:
                                        bearerAuthHeader(expiredToken),
                                })
                                .get(authPath(AUTH.REFRESH_LOGIN_TOKEN))
                                .expect(401)
                                .end(async (err, res) => {
                                    if (err)
                                        return done({
                                            body: res.body,
                                            _data: res.request._data,
                                            err,
                                        });
                                    setApiResponse({ response: res });
                                    done();
                                });
                        });
                });
        });

        test("Return new token for existing soon to be expired token (same if otherwise)", (done) => {
            let jwtToken = jwt.sign(
                {
                    emailAddress: authUser.emailAddress,
                    id: authUser._id,
                },
                process.env.JWT_SECRET_KEY,
                {
                    expiresIn: 10 * 60,
                }
            );
            agent
                .set({ Authorization: bearerAuthHeader(jwtToken) })
                .get(authPath(AUTH.REFRESH_LOGIN_TOKEN))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    const { token } = res.body.data;
                    expect(token).to.be.equal(jwtToken);
                    jwtToken = jwt.sign(
                        {
                            emailAddress: authUser.emailAddress,
                            id: authUser._id,
                            countryPrefix: authUser.countryPrefix,
                        },
                        process.env.JWT_SECRET_KEY,
                        {
                            expiresIn: 10 * 60, //* 10 mins
                        }
                    );

                    process.env.LOGIN_REFRESH_UNTIL = "2d";

                    agent
                        .set({ Authorization: bearerAuthHeader(jwtToken) })
                        .get(authPath(AUTH.REFRESH_LOGIN_TOKEN))
                        .expect(200)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            const { token } = res.body.data;

                            expect(token).not.to.be.equal(jwtToken);
                            setApiResponse({ response: res });
                            done();
                        });
                });
        });
    });
    describe(`POST ${authPath(AUTH.PHONE)}`, () => {
        test(`Send otp for new phone number of existing user`, (done) => {
            let body = {
                phoneNumber: randomNumString(),
                countryPrefix: COUNTRY_DIAL_CODE.IND,
            };
            agentAuth
                .post(authPath(AUTH.PHONE))
                .send(body)
                .expect(202)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    setApiResponse({
                        body,

                        response: res,
                    });
                    done();
                });
        });
    });
    describe(`PUT ${authPath(AUTH.PHONE)}`, () => {
        test(`Verify otp for new phone number of existing user`, (done) => {
            let body = {
                phoneNumber: randomNumString(),
                countryPrefix: COUNTRY_DIAL_CODE.IND,
            };
            agentAuth
                .post(authPath(AUTH.PHONE))
                .send(body)
                .expect(202)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    body = { otp: res.body._test.otp + 46, token: data.token };
                    agentAuth
                        .put(authPath(AUTH.PHONE))
                        .send(body)
                        .expect(201)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            //                            console.log(res.body);return done();
                            let { data } = res.body;
                            expect(data.token).to.be.not.null;
                            setApiResponse({
                                body,

                                response: res,
                            });
                            done();
                        });
                });
        });
    });

    describe(`PATCH ${authPath(AUTH.PHONE)}`, () => {
        test(`Make phone primary`, (done) => {
            MentorPhone.findOne({
                mentor: authUser._id,
                primary: false,
                verified: true,
            }).then((phn) => {
                let body = {
                    phoneId: phn._id,
                };
                agentAuth
                    .patch(authPath(AUTH.PHONE))
                    .send(body)
                    .expect(205)
                    .end(async (err, res) => {
                        if (err)
                            return done({
                                body: res.body,
                                _data: res.request._data,
                                err,
                            });
                        //                        console.log(res.body);
                        let phone = await MentorPhone.findOne({
                            _id: phn._id,
                            primary: true,
                        });
                        expect(phone).to.be.not.null;

                        setApiResponse({
                            body,

                            response: res,
                        });
                        done();
                    });
            });
        });
    });

    describe(`DELETE ${authPath(AUTH.PHONE)}`, () => {
        test(`Delete non-primary phone`, (done) => {
            MentorPhone.findOne({
                mentor: authUser._id,
                primary: false,
                verified: true,
            }).then((phn) => {
                let body = {
                    phoneId: phn._id,
                };
                agentAuth
                    .delete(authPath(AUTH.PHONE))
                    .send(body)
                    .expect(200)
                    .end(async (err, res) => {
                        if (err)
                            return done({
                                body: res.body,
                                _data: res.request._data,
                                err,
                            });
                        //console.log(res.body);
                        let phone = await MentorPhone.findOne({
                            _id: phn._id,
                        });
                        expect(phone).to.be.null;

                        setApiResponse({
                            body,

                            response: res,
                        });
                        done();
                    });
            });
        });
    });

    describe(`POST ${authPath(AUTH.EMAIL)}`, () => {
        test(`Send otp for new email address of existing user`, (done) => {
            let body = {
                emailAddress: randomEmail(),
            };
            agentAuth
                .post(authPath(AUTH.EMAIL))
                .send(body)
                .expect(202)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //                    console.log(res.body); return done();
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    setApiResponse({
                        body,

                        response: res,
                    });
                    done();
                });
        });
    });
    describe(`PUT ${authPath(AUTH.EMAIL)}`, () => {
        test(`Verify otp for new email address of existing user`, (done) => {
            let body = {
                emailAddress: randomEmail(),
            };
            agentAuth
                .post(authPath(AUTH.EMAIL))
                .send(body)
                .expect(202)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    body = { otp: res.body._test.otp + 46, token: data.token };
                    agentAuth
                        .put(authPath(AUTH.EMAIL))
                        .send(body)
                        .expect(201)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            //console.log(res.body);
                            let { data } = res.body;
                            expect(data.token).to.be.not.null;
                            setApiResponse({
                                body,

                                response: res,
                            });
                            done();
                        });
                });
        });
    });

    describe(`PATCH ${authPath(AUTH.EMAIL)}`, () => {
        test(`Make email primary`, (done) => {
            MentorEmail.findOne({
                mentor: authUser._id,
                primary: false,
                verified: true,
            }).then((eml) => {
                let body = {
                    emailId: eml._id,
                };
                agentAuth
                    .patch(authPath(AUTH.EMAIL))
                    .send(body)
                    .expect(205)
                    .end(async (err, res) => {
                        if (err)
                            return done({
                                body: res.body,
                                _data: res.request._data,
                                err,
                            });
                        //console.log(res.body);
                        let email = await MentorEmail.findOne({
                            _id: eml._id,
                            primary: true,
                        });
                        expect(email).to.be.not.null;
                        let usr = await Mentor.findOne({
                            _id: authUser._id,
                            emailAddress: email.emailAddress,
                        });
                        expect(usr).to.be.not.null;
                        setApiResponse({ body, response: res });
                        done();
                    });
            });
        });
    });

    describe(`DELETE ${authPath(AUTH.EMAIL)}`, () => {
        test(`Delete non-primary email`, (done) => {
            MentorEmail.findOne({
                mentor: authUser._id,
                primary: false,
                verified: true,
            }).then((eml) => {
                let body = {
                    emailId: eml._id,
                };
                agentAuth
                    .delete(authPath(AUTH.EMAIL))
                    .send(body)
                    .expect(200)
                    .end(async (err, res) => {
                        if (err)
                            return done({
                                body: res.body,
                                _data: res.request._data,
                                err,
                            });
                        //console.log(res.body);
                        let email = await MentorEmail.findOne({
                            _id: eml._id,
                        });
                        expect(email).to.be.null;

                        setApiResponse({ body, response: res });
                        done();
                    });
            });
        });
    });
    describe(`GET ${authPath(AUTH.TOTP)}`, () => {
        test(`Generate new TOTP key`, (done) => {
            agentAuth
                .get(authPath(AUTH.TOTP))
                .expect(201)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //                    console.log(res.body);return done();
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    expect(data.secret).to.be.not.null;
                    expect(data.qrcode).to.be.not.null;
                    expect(data.otpauth).to.be.not.null;
                    setApiResponse({ response: res });
                    done();
                });
        });
    });
    describe(`POST ${authPath(AUTH.TOTP)}`, () => {
        test(`Verify TOTP otp and set totp as default 2FA if token provided`, (done) => {
            agentAuth
                .get(authPath(AUTH.TOTP))
                .expect(201)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //                    console.log(res.body); return done();
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    expect(data.secret).to.be.not.null;
                    let body = {
                        token: data.token,
                        otp: authenticator.generate(data.secret),
                    };
                    agentAuth
                        .post(authPath(AUTH.TOTP))
                        .send(body)
                        .expect(201)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            //                            console.log(res.body);return done();
                            setApiResponse({ body, response: res });
                            done();
                        });
                });
        });
    });

    describe(`DELETE ${authPath(AUTH.TOTP)}`, () => {
        test(`Revoke existing TOTP key and set EMAIL as default 2FA`, (done) => {
            authAgent(agent).then((agentAuth) => {
                agentAuth
                    .get(authPath(AUTH.TOTP))
                    .expect(201)
                    .end(async (err, res) => {
                        if (err)
                            return done({
                                body: res.body,
                                _data: res.request._data,
                                err,
                            });
                        let { data } = res.body;
                        expect(data.token).to.be.not.null;
                        expect(data.secret).to.be.not.null;
                        let body = {
                            token: data.token,
                            otp: authenticator.generate(data.secret),
                        };
                        agentAuth
                            .post(authPath(AUTH.TOTP))
                            .send(body)
                            .expect(201)
                            .end(async (err, res) => {
                                if (err)
                                    return done({
                                        body: res.body,
                                        _data: res.request._data,
                                        err,
                                    });
                                agentAuth
                                    .delete(authPath(AUTH.TOTP))
                                    .expect(200)
                                    .end(async (err, res) => {
                                        if (err)
                                            return done({
                                                body: res.body,
                                                _data: res.request._data,
                                                err,
                                            });
                                        setApiResponse({
                                            response: res,
                                        });
                                        done();
                                    });
                            });
                    });
            });
        });
    });
    describe(`GET ${authPath(AUTH.TWOFA)}`, () => {
        test(`Send 2FA OTP using user's preference or SMS`, (done) => {
            agentAuth
                .get(authPath(AUTH.TWOFA))
                .expect(202)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    let { data } = res.body;
                    setApiResponse({ response: res });
                    done();
                });
        });
    });

    describe(`GET ${authPath(AUTH.TWOFA)}`, () => {
        test(`Send 2FA OTP using custom EMAIL method`, (done) => {
            let query = { twoFactor: TwoFactorType.EMAIL };
            agentAuth
                .get(authPath(AUTH.TWOFA))
                .query(query)
                .expect(202)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    let { data } = res.body;
                    expect(data.token).to.be.not.null;
                    setApiResponse({ response: res, query });
                    done();
                });
        });
    });
    describe(`GET ${authPath(AUTH.TWOFA)}`, () => {
        test(`Get 2FA OTP token using TOTP method (if exists)`, (done) => {
            let query = { twoFactor: TwoFactorType.TOTP };
            authAgent(agent, true).then((data) => {
                let { agent, user } = data;
                agent
                    .get(authPath(AUTH.TWOFA))
                    .query(query)
                    .expect(403)
                    .end(async (err, res) => {
                        if (err)
                            return done({
                                body: res.body,
                                _data: res.request._data,
                                err,
                            });
                        //                    console.log(res.body); return done();
                        setApiResponse({ response: res, query });
                        agent
                            .get(authPath(AUTH.TOTP))
                            .expect(201)
                            .end(async (err, res) => {
                                if (err)
                                    return done({
                                        body: res.body,
                                        _data: res.request._data,
                                        err,
                                    });
                                //                    console.log(res.body); return done();
                                let { data } = res.body;
                                expect(data.token).to.be.not.null;
                                expect(data.secret).to.be.not.null;
                                let body = {
                                    token: data.token,
                                    otp: authenticator.generate(data.secret),
                                };
                                agent
                                    .post(authPath(AUTH.TOTP))
                                    .send(body)
                                    .expect(201)
                                    .end(async (err, res) => {
                                        if (err)
                                            return done({
                                                body: res.body,
                                                _data: res.request._data,
                                                err,
                                            });
                                        agent
                                            .get(authPath(AUTH.TWOFA))
                                            .query(query)
                                            .expect(202)
                                            .end(async (err, res) => {
                                                if (err)
                                                    return done({
                                                        body: res.body,
                                                        _data: res.request
                                                            ._data,
                                                        err,
                                                    });
                                                //       console.log(res.body); return done();
                                                setApiResponse({
                                                    response: res,
                                                    query,
                                                });
                                                done();
                                            });
                                    });
                            });
                    });
            });
        });
    });

    describe(`POST ${authPath(AUTH.TWOFA)}`, () => {
        test(`Verify 2FA OTP (with token if not TOTP)`, (done) => {
            let totpKey = authenticator.generateSecret();
            authAgent(agent, true).then((data) => {
                let { agent: agentAuth, user } = data;
                Mentor.findOneAndUpdate(
                    {
                        _id: user._id,
                    },
                    {
                        $set: {
                            totpKey,
                            twoFactor: TwoFactorType.TOTP,
                        },
                    },
                    { new: true }
                ).then((user) => {
                    agentAuth
                        .get(authPath(AUTH.TWOFA))
                        .query({ twoFactor: TwoFactorType.TOTP })
                        .expect(202)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            //       console.log(res.body); return done();
                            let body = {
                                otp: authenticator.generate(user.totpKey),
                            };
                            agentAuth
                                .post(authPath(AUTH.TWOFA))
                                .send(body)
                                .expect(200)
                                .end(async (err, res) => {
                                    if (err)
                                        return done({
                                            body: res.body,
                                            _data: res.request._data,
                                            err,
                                        });
                                    //     console.log(res.body); return done();
                                    let { data } = res.body;
                                    expect(data.token).to.be.not.null;
                                    setApiResponse({
                                        response: res,
                                        body,
                                    });
                                    done();
                                });
                        });
                });
            });
        });
    });

    describe(`PUT ${authPath(AUTH.TWOFA)}`, () => {
        test(`Turn on 2FA or change 2FA method`, (done) => {
            let body = { twoFactor: TwoFactorType.SMS };
            agentAuth
                .put(authPath(AUTH.TWOFA))
                .send(body)
                .expect(201)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    setApiResponse({ response: res, body });
                    done();
                });
        });
    });

    describe(`DELETE ${authPath(AUTH.TWOFA)}`, () => {
        test(`Turn off 2FA (deletes totpKey if present)`, (done) => {
            agentAuth
                .delete(authPath(AUTH.TWOFA))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    setApiResponse({ response: res });
                    done();
                });
        });
    });

    describe(`PATCH ${authPath(AUTH.PASSWORD)}`, () => {
        test(`Change password using old password`, (done) => {
            let newpassword = randomString({ nonAlphaNum: true }) + "@#9Aa";
            let body = { oldpassword: randomString({}), newpassword };
            agentAuth
                .patch(authPath(AUTH.PASSWORD))
                .send(body)
                .expect(403)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    //console.log(res.body);
                    setApiResponse({ response: res, body });
                    let user = await Mentor.findOne({ _id: authUser._id });
                    user.password = randomString({ nonAlphaNum: true });
                    body.oldpassword = user.password;
                    await user.save();
                    agentAuth
                        .patch(authPath(AUTH.PASSWORD))
                        .send(body)
                        .expect(200)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            //console.log(res.body);
                            setApiResponse({ response: res, body });
                            done();
                        });
                });
        });
    });
});
