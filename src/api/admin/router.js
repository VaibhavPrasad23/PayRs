const router = require("express").Router();
const { admin: ADMIN } = require("../endpoints");
const admin = require("./controller");

router.get(ADMIN.COLLECTIONS, admin.getCollections);
router.get(ADMIN.COLLECTION_INFO, admin.getCollectionInfo);
router.get(ADMIN.COLLECTION_DATA, admin.getCollectionData);
router.post(ADMIN.COLLECTION_DATA, admin.createCollectionRecord);
router.put(ADMIN.COLLECTION_DATA, admin.updateCollectionRecord);
router.delete(ADMIN.COLLECTION_DATA, admin.deleteCollectionRecord);

module.exports = router;
