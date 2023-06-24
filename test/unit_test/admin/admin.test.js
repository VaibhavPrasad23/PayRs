require("../../init");
const { expect } = require("chai");
const request = require("supertest");
const dbHandler = require("../../utils/db");
const app = require("../../../src/app");
const { authAdminAgent } = require("../../utils/auth");
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

let authUser = null;

const { admin } = require("../../../src/api/endpoints");
const Schemata = require("@payr/schemata");
const { strictTransportSecurity } = require("helmet");

beforeAll(async () => {
    await dbHandler.connectInitDatabase();
    const data = await authAdminAgent(agentAuth, true);
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

const adminPath = (endpoint = "", query = {}) =>
    `${admin.SELF}${endpoint}` +
    (Object.keys(query).length
        ? "?" + new URLSearchParams(query).toString()
        : "");

describe(`Admin`, () => {
    describe(`GET ${adminPath(admin.COLLECTIONS)}`, () => {
        test("Get collection names", (done) => {
            agentAuth
                .get(adminPath(admin.COLLECTIONS))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data.collections).to.be.not.null;
                    // console.log(data.collections)
                    setApiResponse({ response: res });
                    done();
                });
        });
    });
    describe(`GET ${adminPath(admin.COLLECTION_INFO)}`, () => {
        test("Get collection info", (done) => {
            const query = {
                collection: "Mentor",
            };
            agentAuth
                .get(adminPath(admin.COLLECTION_INFO, query))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data.fields).to.be.not.null;
                    expect(data.total).to.be.greaterThanOrEqual(0);
                    setApiResponse({ response: res, query });
                    done();
                });
        });
    });

    describe(`GET ${adminPath(admin.COLLECTION_DATA)}`, () => {
        test("Get collection data", (done) => {
            const query = {
                collection: "Mentor",
                page: 1,
                size: 10,
            };
            agentAuth
                .get(adminPath(admin.COLLECTION_DATA, query))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data, total } = res.body;
                    expect(total).to.be.greaterThan(0);
                    expect(data.length).to.be.greaterThan(0);
                    setApiResponse({ response: res, query });
                    done();
                });
        });
    });

    describe(`GET ${adminPath(admin.COLLECTION_DATA)}`, () => {
        test("Get a collection record", (done) => {
            const query = {
                collection: "MentorEmail",
                page: 1,
                size: 10,
            };
            agentAuth
                .get(adminPath(admin.COLLECTION_DATA, query))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data, total } = res.body;
                    expect(total).to.be.greaterThan(0);
                    expect(data.length).to.be.greaterThan(0);
                    query._id = data[0]._id;
                    agentAuth
                        .get(adminPath(admin.COLLECTION_DATA, query))
                        .expect(200)
                        .end(async (err, res) => {
                            if (err)
                                return done({
                                    body: res.body,
                                    _data: res.request._data,
                                    err,
                                });
                            let { data: data2 } = res.body;
                            expect(data2).to.be.not.null;
                            expect(data2._id).to.be.equal(query._id);
                            expect(data2.mentor._id).to.be.equal(
                                data[0].mentor
                            );
                            setApiResponse({ response: res, query });
                            done();
                        });
                });
        });
    });

    describe(`POST ${adminPath(admin.COLLECTION_DATA)}`, () => {
        test("Create a collection record", (done) => {
            const query = {
                collection: "Mentor",
            };
            const body = {
                collection: query.collection,
                set: [
                    {
                        field: "fullName",
                        value: randomString({}),
                    },
                    {
                        field: "emailAddress",
                        value: randomEmail(),
                    },
                    {
                        field: "password",
                        value: randomString({}),
                    },
                    {
                        field: "dob",
                        value: new Date().toISOString(),
                    },
                ],
            };
            agentAuth
                .post(adminPath(admin.COLLECTION_DATA))
                .send(body)
                .expect(201)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data } = res.body;
                    expect(data).to.be.not.null;
                    setApiResponse({ response: res, body });
                    done();
                });
        });
    });
    describe(`PUT ${adminPath(admin.COLLECTION_DATA)}`, () => {
        test("Update a collection record", (done) => {
            const query = {
                collection: "Mentor",
            };
            agentAuth
                .get(adminPath(admin.COLLECTION_DATA, query))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data, total } = res.body;
                    expect(total).to.be.greaterThan(0);
                    const oldrecord = data[0];
                    const body = {
                        collection: query.collection,
                        _id: oldrecord._id,
                        set: [
                            {
                                field: "fullName",
                                value: randomString({}),
                            },
                            {
                                field: "suspended",
                                value: true,
                            },
                            {
                                field: "password",
                                value: randomString({ nonAlphaNum: true }),
                            },
                        ],
                    };
                    agentAuth
                        .put(adminPath(admin.COLLECTION_DATA))
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
                            expect(data).to.be.not.null;
                            expect(data._id).to.be.equal(oldrecord._id);
                            expect(data.fullName).to.be.not.equal(
                                oldrecord.fullName
                            );
                            expect(data.suspended).to.be.not.equal(
                                oldrecord.suspended
                            );
                            expect(data.suspended).to.be.true;
                            setApiResponse({ response: res, body });
                            done();
                        });
                });
        });
    });
    describe(`DELETE ${adminPath(admin.COLLECTION_DATA)}`, () => {
        test("Delete a collection record", (done) => {
            const query = {
                collection: "Mentor",
            };
            agentAuth
                .get(adminPath(admin.COLLECTION_DATA, query))
                .expect(200)
                .end(async (err, res) => {
                    if (err)
                        return done({
                            body: res.body,
                            _data: res.request._data,
                            err,
                        });
                    let { data, total } = res.body;
                    expect(total).to.be.greaterThan(0);
                    const oldrecord = data[0];
                    const body = {
                        collection: query.collection,
                        _id: oldrecord._id,
                    };
                    agentAuth
                        .delete(adminPath(admin.COLLECTION_DATA))
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
                            expect(data).to.be.not.null;
                            expect(data.deleted._id).to.be.equal(oldrecord._id);
                            let exists = await Schemata[
                                query.collection
                            ].countDocuments({ _id: oldrecord._id });
                            expect(!exists).to.be.true;
                            setApiResponse({ response: res, body });
                            done();
                        });
                });
        });
    });
});
