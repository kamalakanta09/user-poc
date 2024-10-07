/******************************************************************************************
 * Name: Index file                                                                        *
 * Description: Landing file                                                               *
 * AuthurName           API Version          Date                                          *
 * Kamalakanta           V1.0               06-10-2024                                     *
 *******************************************************************************************/
'use strict';
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Routes
const fileHandler = require('./Routes/fileHandler');

app.use(
    cors({
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,PUT,POST,GET,DELETE",
    })
);

app.use(fileHandler);

const PORT = process.env.PORT || 9900;
app.listen(PORT, process.env.IP, function() {
    console.log("Running on PORT", PORT);
});

module.exports = app;