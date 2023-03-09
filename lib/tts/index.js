const router = require('express').Router();

router.use('/google', require('./google'));

module.exports = router;
