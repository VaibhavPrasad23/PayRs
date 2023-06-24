const router = require("express").Router();

const { v1 } = require("../../endpoints");

router.use(v1.AUTH.SELF, require("./auth"));

module.exports = router;
