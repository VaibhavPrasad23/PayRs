const Joi = require("./joi");
const { MIN_ZSCORE } = require("./constants");
const { Types } = require("mongoose");
const btoa = (str) => {
    return new Buffer.from(str, "binary").toString("base64");
};

const atob = (str) => {
    return new Buffer.from(str, "base64").toString("binary");
};

/**
 * Converts an array buffer to base64url
 * @param {Uint8Array} buffer The array buffer to be converted to base64url
 * @returns {String} The base64url encoded array buffer
 */
const arrayBufferToBase64Url = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
};

const castToType = (value) => {
    switch (value) {
        case "false":
            return false;
        case false:
            return false;
        case "true":
            return true;
        case true:
            return true;
        case "null":
            return null;
        case "undefined":
            return undefined;
        case null:
            return null;
        case undefined:
            return undefined;
        case "":
            return "";
        default: {
            if (!Joi.countryCode().validate(value).error) return value;
            if (!Joi.objectId().validate(value).error)
                return Types.ObjectId(value);
            if (!Joi.string().uri().validate(value).error) return value;
            if (!isNaN(value) && !(value instanceof Date)) return Number(value);
            if (!Joi.json().validate(value).error) return JSON.parse(value);
            if (new Date(value) != "Invalid Date")
                return new Date(value).toISOString();
            return value;
        }
    }
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
        ? randomString({
              length: Math.floor(length / 4),
              onlySpecial: true,
          }) +
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

module.exports = {
    atob,
    btoa,
    arrayBufferToBase64Url,
    randomString,
    castToType,
    castObjectValuesToType: (object = {}, except = {}) => {
        if (!object) return object;
        let keys = Object.keys(object);
        let kl = keys.length;
        for (let i = 0; i < kl; i++) {
            if (except[keys[i]]) continue;
            object[keys[i]] = castToType(object[keys[i]]);
        }
        return object;
    },
    randomIntFromInterval: (min, max) =>
        Math.floor(Math.random() * (max - min + 1) + min),

    /**
     * Returns random numeric string.
     * @param {Number} length Total string length. Defaults to 10
     * @returns {String} Random numeric string
     */
    randomNumString: (length = 10) => {
        let result = "";
        const characters = "123456789";
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
        }
        return result;
    },

    /**
     * Converts an object to base64url
     * @param {Object} payload The payload to be converted to base64url
     * @returns {String} The base64url encoded payload
     */
    objectToBase64url: (payload) => {
        return arrayBufferToBase64Url(
            new TextEncoder().encode(JSON.stringify(payload))
        );
    },

    isCountMiltesone: (count = 0) => {
        let hs = new Array(9).fill(100).map((h, i) => h * 10 ** i);
        let tfhs = hs.map((h) => h * 2.5);
        let fhs = hs.map((h) => h * 5);
        let stones = [...hs, ...tfhs, ...fhs];
        let pos = stones.indexOf(Number(count));
        if (pos < 0) return false;
        return stones[pos];
    },

    scaleValue: (val, min, max, llim = MIN_ZSCORE, ulim = 1) => {
        return Number(
            parseFloat(
                ((val - min) * (ulim - llim)) / (max - min) + llim
            ).toFixed(String(MIN_ZSCORE).split(".")[1].length || 2)
        );
    },
    tokenAuthHeader: (token = "") => "Token " + token,
    bearerAuthHeader: (token = "") => "Bearer " + token,
    basicAuthHeader: (username = "", password = "") =>
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
    hostName: (path = "", query = {}) => {
        let base = `${process.env.HOST_NAME ?? process.env.HOSTNAME}${path}`;

        if (Object.keys(query).length) {
            base = `${
                process.env.HOST_NAME ?? process.env.HOSTNAME
            }${path}/?${new URLSearchParams(query).toString()}`;
        }
        return base;
    },
};
