const express = require("express");
const router = express.Router();

const Message = require("../models/Message");

router.get("/", async (req, res) => {

    try {

        const messages = await Message.find().sort({ createdAt: 1 });

        res.json(messages);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

module.exports = router;