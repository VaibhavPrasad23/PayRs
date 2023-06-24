require("../config");

process.env.NODE_ENV = require("../src/utils/strings").ENV.test;
process.env.REDIS_URI = "redis://testing:testing@localhost:6379/";
process.env.HOSTNAME = "https://api.mentor.payr.org.in";
process.env.JWT_SECRET_KEY = "X_lixBn5b2LjAR3_LaOuCD8MLjjS4It_4cuhuA";
process.env.DELAY_BLACKLIST = 1;
process.env.X_PAYR_APP_KEY = "abcd";
process.env.LOGS_DIR = "testlogs/";
process.env.LOGIN_VALIDITY = "1d";
process.env.LOGIN_REFRESH_UNTIL = "6h";

jest.mock("redis", () => require("redis-mock"));
jest.mock("ioredis", () => require("ioredis-mock"));
jest.mock("axios");
// jest.mock("aws-sdk", () => {
//     class mockS3 {
//         upload(..._) {
//             return {
//                 promise: () => {
//                     return new Promise(function (resolve) {
//                         resolve({ Location: "/test_url/img" });
//                     });
//                 },
//             };
//         }
//         deleteObject(..._) {
//             return {
//                 promise: () => {
//                     return new Promise(function (resolve) {
//                         resolve({ status: "Success" });
//                     });
//                 },
//             };
//         }
//         getSignedUrlPromise(..._) {
//             return Promise.resolve("https://example.com");
//         }
//     }
//     return {
//         ...jest.requireActual("aws-sdk"),
//         S3: mockS3,
//     };
// });
//jest.mock("../src/utils/thirdparty");
jest.mock("../src/datasource/redis");
jest.mock("../src/queue");
jest.mock("../src/middlewares/ratelimit");
