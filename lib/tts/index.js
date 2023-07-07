const router = require('express').Router();

router.use('/google', require('./google'));
router.use('/elevenlabs', require('./elevenlabs'));

module.exports = router;
