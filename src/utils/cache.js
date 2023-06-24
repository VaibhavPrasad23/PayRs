module.exports = {
    HMAP: {
        user_data: (userID) => `user:${userID}`,
        user_session_data: (userID) => `user:session:${userID}`,
    },
    ZSET: {},
    SET: {
        unsubscribed_notifications: (userId) =>
            `notifications:${userId}:unsubscribed`,
    },
    ADMIN: {
        total_records: (collectionName) => `admin:${collectionName}:count`,
    },
    blacklistToken: (token) => `bl:${token}`,
    mute_notifications: (userID) => `mute_notifications:${userID}`,
};
