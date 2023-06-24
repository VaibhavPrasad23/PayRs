require("../init");
const { expect } = require("chai");
const request = require("supertest");
const app = require("../../src/app.js");
const { authAgent } = require("../utils/auth");
const { Types } = require("mongoose");
const { setApiResponse, writeApiDoc } = require("../utils/docwriter");
const { redis } = require("../../src/datasource/redis");
const dbHandler = require("../utils/db");
const {
    randomString,
    randomNumString,
    randomUserData,
    randomPhoneData,
    randomEmailData,
    randomEmail,
} = require("../utils/mockdata");

const ENDPOINT = require("../../src/api/endpoints");

const agent = request.agent(app);

let headers = { "x-payr-app-key": process.env.X_PAYR_APP_KEY };
agent.set(headers);

let agentAuth = request.agent(app);
agentAuth.set(headers);

let authUser = null;
let users = [];

const rootPath = (endpoint = "") => `${endpoint}`;
beforeAll(async () => {
    await dbHandler.connectInitDatabase();
    // const data = await authAgent(agentAuth, true);
    // agentAuth = data.agent;
    // authUser = data.user;
});
afterAll(async () => {
    await dbHandler.clearDropDisconnectDatabase();
    writeApiDoc();
});

describe(`App`, () => {
    describe(`GET ${rootPath(ENDPOINT.status)}`, () => {
        test(`Status`, (done) => {
            agent
                .get(rootPath(ENDPOINT.status))
                .expect(200)
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
