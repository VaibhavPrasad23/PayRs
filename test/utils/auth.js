const {
    v1: { AUTH },
} = require("../../src/api/endpoints");
const { bearerAuthHeader } = require("../../src/utils");

const {
    randomUserData,
    randomModeratorData,
    randomSuperModData,
    randomAdminData,
    randomFollowData,
    randomEmail,
    randomPhoneData,
} = require("./mockdata");

const {
    Mentor,
    MentorPhone,
    MentorEmail,
    CountryDialCode: COUNTRY_DIAL_CODE,
} = require("@payr/schemata");

const authPath = (endpoint = "") => `${AUTH.SELF}${endpoint}`;
const authLoginWPasswordPath = authPath(AUTH.LOGIN);

module.exports = {
    authPath,
    authLoginWPasswordPath,
    /**
     * Returns modified agent object with a valid new user's authentication token header.
     * @param {import("supertest").SuperAgentTest} agent The agent object to be modified.
     * @param {Boolean} returnUser If true, then returns JSON with agent and user object. Defaults to false and returns agent object only.
     * @returns {Promise<import("supertest").SuperAgentTest>} Agent object
     * @returns {JSON<import("supertest").SuperAgentTest, User>} Agent object and user object in JSON
     */
    authAgent: async (agent, returnUser = false) => {
        let user = await Mentor.create(randomUserData());
        await MentorPhone.create({
            mentor: user._id,
            phoneNumber: randomPhoneData({}).phoneNumber,
            countryPrefix: randomPhoneData({}).countryPrefix,
            primary: true,
            verified: true,
        });

        await MentorEmail.create({
            mentor: user._id,
            emailAddress: user.emailAddress,
            primary: true,
            verified: true,
        });
        let headers = { "x-payr-app-key": process.env.X_PAYR_APP_KEY };
        let res = await agent
            .set(headers)
            .post(authLoginWPasswordPath)
            .send({ emailAddress: user.emailAddress, password: user.password })
            .expect(200);

        if (!res.body.data.token) {
            throw Error(res);
        }
        headers = {
            ...headers,
            Authorization: bearerAuthHeader(res.body.data.token),
        };
        agent.set(headers);
        if (returnUser) {
            return { agent, user, headers };
        }
        return agent;
    },
    authAdminAgent: async (agent, returnUser = false) => {
        let user = await Mentor.create({ ...randomUserData(), is_admin: true });
        await MentorPhone.create({
            mentor: user._id,
            phoneNumber: randomPhoneData({}).phoneNumber,
            countryPrefix: randomPhoneData({}).countryPrefix,
            primary: true,
            verified: true,
        });

        await MentorEmail.create({
            mentor: user._id,
            emailAddress: user.emailAddress,
            primary: true,
            verified: true,
        });
        let headers = { "x-payr-app-key": process.env.X_PAYR_APP_KEY };
        let res = await agent
            .set(headers)
            .post(authLoginWPasswordPath)
            .send({ emailAddress: user.emailAddress, password: user.password })
            .expect(200);

        if (!res.body.data.token) {
            throw Error(res);
        }
        headers = {
            ...headers,
            Authorization: bearerAuthHeader(res.body.data.token),
        };
        agent.set(headers);
        if (returnUser) {
            return { agent, user, headers };
        }
        return agent;
    },
};
