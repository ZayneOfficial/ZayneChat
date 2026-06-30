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
router.get("/:user1/:user2", async (req, res) => {

    try {

        const { user1, user2 } = req.params;

        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});