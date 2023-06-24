const { randomIntFromInterval } = require("../../src/utils");

const { CountryDialCode: COUNTRY_DIAL_CODE } = require("@payr/schemata");

const mockBinaryImageData =
    "data:image/png;base64,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";

/**
 * Returns random string.
 * @param {Object} data
 * @param {Number} data.length Total string length. Defaults to 10
 * @param {Boolean} data.nonAlphaNum Whether to include non-alphanumeric characters. Defaults to false
 * @param {Boolean} data.onlySpecial Whether to include only special characters. Defaults to false
 * @returns {String} Random string
 */
const randomString = ({
    length = 10,
    nonAlphaNum = false,
    onlySpecial = false,
}) => {
    let result = "";
    const characters = onlySpecial
        ? "!@#$%^&*.?)"
        : nonAlphaNum
        ? randomString({ length: Math.floor(length / 4), onlySpecial: true }) +
          randomString({ length: Math.floor(length / 3) }) +
          randomNumString(Math.floor(length / 3))
        : "ABCDEFGHIJKLMNOPqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    if (nonAlphaNum && !/[^a-zA-Z0-9]/.test(result)) {
        result =
            randomString({ length: 1, onlySpecial: true }) +
            result.slice(1, length);
        result = result.slice(0, length);
    }
    if (nonAlphaNum && !/[a-z]/.test(result)) {
        result = "b" + result.slice(1, length);
        result = result.slice(0, length);
    }
    if (nonAlphaNum && !/[A-Z]/.test(result)) {
        result = "B" + result.slice(1, length);
        result = result.slice(0, length);
    }
    if (nonAlphaNum && !/[0-9]/.test(result)) {
        result = "1" + result.slice(1, length);
        result = result.slice(0, length);
    }
    return result;
};

/**
 * Returns random numeric string.
 * @param {Number} length Total string length. Defaults to 10
 * @returns {String} Random numeric string
 */
const randomNumString = (length = 10) => {
    let result = "";
    const characters = "123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    return result;
};

const randomURL = () => `https://example.com/${randomString({ length: 10 })}`;
const randomEmail = () =>
    `${randomString({ length: 10 })}@${randomString({
        length: 5,
    })}.com`.toLowerCase();

module.exports = {
    randomEmail,
    randomIntFromInterval,
    randomString,
    randomNumString,
    mockBinaryImageData,
    randomURL,
    /**
     * Returns random user data according to User schema. If limit is 1, then returns only one user data.
     * If limit is greater than 1, then returns an array of user data.
     * @param {Number} limit total random users data to return. Defaults to 1
     * @returns {JSON} User data in JSON
     * @returns {Array<JSON>} Array of user data in JSON
     */
    randomUserData: (limit = 1) => {
        let data = [];
        for (let i = 0; i < limit; i++) {
            data.push({
                emailAddress: randomEmail(),
                password: randomString({ length: 20, nonAlphaNum: true }),
                userImage: randomURL() + "?Expires=123456789",
                fullName: `Test ${randomString({ length: 6 })}`,
                dob: new Date().toISOString(),
            });
        }
        if (limit === 1) {
            return data[0];
        }
        return data;
    },

    randomUserNotificationData: (...userIDs) => {
        let data = [];
        userIDs.forEach((userID) => {
            data.push({
                user: userID,
                title: randomString({ length: 40 }),
                description: randomString({ length: 80 }),
                image: randomURL(),
                data: { notificationId: randomString({}) },
            });
        });
        if (userIDs.length === 1) {
            return data[0];
        }
        return data;
    },
    randomPhoneData: ({ limit = 1, userIDs = [], extradata = {} }) => {
        let data = [];
        if (!Array.isArray(userIDs)) {
            userIDs = [userIDs];
        }
        for (let i = 0; i < limit; i++) {
            data.push({
                mentor:
                    userIDs.length - 1 >= i
                        ? userIDs[i]
                        : userIDs[userIDs.length - 1],
                phoneNumber: randomNumString(),
                countryPrefix: COUNTRY_DIAL_CODE.IND,
                verified: true,
                primary: false,
                ...extradata,
            });
        }
        if (data.length === 1) {
            return data[0];
        }
        return data;
    },
    randomEmailData: ({ limit = 1, userIDs = [], extradata = {} }) => {
        let data = [];
        if (!Array.isArray(userIDs)) {
            userIDs = [userIDs];
        }
        for (let i = 0; i < limit; i++) {
            data.push({
                mentor:
                    userIDs.length - 1 >= i
                        ? userIDs[i]
                        : userIDs[userIDs.length - 1],
                emailAddress: randomEmail(),
                verified: true,
                primary: false,
                ...extradata,
            });
        }
        if (data.length === 1) {
            return data[0];
        }
        return data;
    },
};
