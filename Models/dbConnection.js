/***************************************************************
* Name: dbConnection file                                      *
* Description: Connection to Database                          *
* AuthurName           API Version          Date               * 
* Kamalakanta           V1.0               05-010-2024         *
****************************************************************/
require('dotenv').config(); 

const mysql = require('mysql2');
const { createPool } = require('mysql');

// Read environment variables
const host = process.env.HOSTNAME;
const user = process.env.USER_NAME;
const password = process.env.PASSWORD;
const database = process.env.DATABASE_NAME;
const connectionLimit = process.env.CONNECTIONLIMT

console.log("host", host);
//Database details
const dbConnection = mysql.createPool({
  host: host,
  user: user,
  password: password,
  database: database,
  waitForConnections: true,
  connectionLimit: connectionLimit,
  queueLimit: 0
});
//DB connection
dbConnection.getConnection((err, connection) => {
    try {
        if (err) {
            console.error('Error connecting to database: ' + err.stack);
            return ({"error": "Error connecting to database:"+ err.stack});
        }
        console.log('Connected to database.');
        connection.release();
    } 
    catch (error) {
        return ({"error": "DB connection error"});
    }
});

module.exports = { dbConnection };

