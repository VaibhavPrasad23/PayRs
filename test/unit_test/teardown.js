module.exports = async () => {
    if (global.__MONGOD__) {
        global.__MONGOD__.forEach((element) => {
            element.stop();
        });
    }
    if (global.__MONGOREPL__) {
        global.__MONGOREPL__.forEach((element) => {
            element.stop();
        });
    }
};
