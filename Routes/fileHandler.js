/********************************************************************
* Name: File Handler                                                *
* Description: File Handler Details inserting to Database           *
* AuthurName           API Version          Date                    * 
* Kamalakanta           V1.0               06-10-2024               *
**********************************************************************/
'use strict';
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
// const NodeCache = require("node-cache");
// const myCache = new NodeCache();

const db = require('../Models/dbConnection');
const authenticateToken = require('../Middleware/authMiddleware');

const secretKey = process.env.SECRET_KEY;
const refreshsecretKey = process.env.REFRESH_SECRET_KEY;
const tokenExpiration = process.env.TOKEN_EXPIRATION;
const refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRATION;

router.use(bodyParser.json());

/*
    Create a User 
*/
router.post('/api/v1/user/signup', async(req, res) => {
    try {
        let {firstname, lastname, email, password, created_by, updated_by, role} = req.body;
        if (!firstname || !lastname || !email || !password) {
            return res.status(400).json({ fetch: true, message: "Body params missing" });
        }

        email = email.toLowerCase();
        // Check if the email already exists in the database;
        const sqlQuery = 'SELECT * FROM users WHERE email = ?';
        const values = [email];

        db.dbConnection.query(sqlQuery, values, (err, result) => {
            if(err){
                console.log("Error checking users database", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            if(result.length > 0) {
                return res.status(409).send({fetch: false, message:'Already Email ID is present in database'});
            }
            if (email && password) {
                // Insert to Database
                const sqlQuery = 'INSERT INTO users (firstname, lastname, email, password, created_by, updated_by, role) VALUES (?, ?, ?, ?, ?, ?, ?)';
                const values = [firstname, lastname, email, password, created_by, updated_by, role];
                db.dbConnection.query(sqlQuery, values, (err, data) => {
                    if(err) {
                        console.error('Error inserting user into database: ' + error.stack);
                        return res.status(400).send({fetch:false, message: 'Error inserting user into database:'+err.stack});
                    }
                    const token = jwt.sign({ email: email }, secretKey, { expiresIn: tokenExpiration });
                    const refreshToken = jwt.sign({ email: email }, refreshsecretKey, { expiresIn: refreshTokenExpiration });
                   
                    return res.status(200).send({message:"Account created successfully", token, refreshToken});
                });
            }
            
        });

    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});

// Handle login request
router.post('/api/v1/user/signin', async(req, res) => {
    try {
        let { email, password } = req.body;
        console.log("Email", email);
        console.log("password:", password);

        if (!email || !password) {
            return res.status(400).json({ fetch: false, message: "Body params missing" });
        }
        email = email.toLowerCase();
        // Check if user exists and password is correct
        const sqlQuery = 'SELECT * FROM users WHERE email = ? AND password = ?';
        const values = [email, password];
        db.dbConnection.query(sqlQuery, values, (err, result) => {
            if (err) {
                console.log("Error  checking user", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            if(result.length === 0){
                return res.status(409).send({fetch: false, message:'Invalid username or password'});
            }
            
            const token = jwt.sign({ email: email }, secretKey, { expiresIn: tokenExpiration });
            const refreshToken = jwt.sign({ email: email }, refreshsecretKey, { expiresIn: refreshTokenExpiration });

            console.log('Login successful');
            return res.status(200).send({ message: 'Login successful', token, refreshToken});
        });

    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});
// Get all users
router.get('/api/v1/user/all', authenticateToken, async(req, res) => {
    try {
        //Set page and limit
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        // Calculate the offset for the SQL query
        let offset = (page - 1) * limit;

        const sqlQuery = 'SELECT * FROM users LIMIT ? OFFSET ?';

        db.dbConnection.query(sqlQuery, [limit, offset], (err, result) => {
            if (err) {
                console.log("Error  checking user", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            if (result.length === 0) {
                return res.status(409).send({fetch: false, message:'No users found in the database'}); 
            }
            return res.status(200).send({ fetch: true, data: result, page, limit });
        });
        
    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});
//Gat a user
router.get('/api/v1/user/:userid', authenticateToken, async(req, res) => {
    try {
        let email = req.params.userid;
        email = email.toLocaleLowerCase();

        // const cachedData = myCache.get(email);
        // if (cachedData) {
        //     return res.status(200).send(cachedData);
        // }
        // Check if user exists in database
        const sqlQuery = 'SELECT * FROM users WHERE email = ?';
        const values = [email];

        db.dbConnection.query(sqlQuery, values, (err, result) => {
            if (err) {
                console.log("Error  checking user", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            if (result.length === 0) {
                return res.status(409).send({fetch: false, message:'User id does not present, please signup !!!'});
            }
            // myCache.set(email, result[0], 600);
            return res.status(200).send(result[0]);
        });

    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});

router.put('/api/v1/user/:userid', authenticateToken, async(req, res) => {
    try {
        let email = req.params.userid;

        const { firstname, lastname,password, updated_by, role } = req.body;

        email = email.toLocaleLowerCase();
         // Check if user exists in database
         const sqlQuery = 'SELECT * FROM users WHERE email = ?';
         const values = [email];

        db.dbConnection.query(sqlQuery, values, (err, result) => {
            if (err) {
                console.log("Error  checking user", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            if (result.length === 0) {
                return res.status(409).send({fetch: false, message:'User id does not present, please signup !!!'});
            }
            // If user exists
            const updateFields = [];
            const updateValues = [];

            if (firstname) {
                updateFields.push("firstname = ?");
                updateValues.push(firstname);
            }
            if (lastname) {
                updateFields.push("lastname = ?");
                updateValues.push(lastname);
            }
            if (password) {
                updateFields.push("password = ?");
                updateFields.push(password);
            }
            if (role) {
                updateFields.push("role = ?");
                updateValues.push(role);
            }
            if (updated_by) {
                updateFields.push("updated_by = ?");
                updateValues.push(updated_by);
            }
            // If no filds to update
            if (updateFields.length === 0) {
                return res.status(400).send({ fetch: false, message: 'No fields to update' });
            }

            updateValues.push(email);

            const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE email = ?`;
            db.dbConnection.query(updateQuery, updateValues, (err, result) => {
                if (err) {
                    console.log("Error  checking user", err);
                    return res.status(500).send({fetch: false, error: "Error checking users database"});
                }
                return res.status(200).send({ fetch: true, message: 'User record updated successfully',result });
            });
        });

    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});
// Delete Api
router.delete('/api/v1/user/all', authenticateToken, async(req, res) => {
    try {
        const sqlQuery = 'DELETE FROM users';
        db.dbConnection.query(sqlQuery, (err, result) => {
            if (err) {
                console.log("Error  checking user", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            return res.status(200).send({ fetch: true, message: 'All users have been deleted successfully' });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});

router.delete('/api/v1/user/:userid', authenticateToken, async(req, res) => {
    try {
        let email = req.params.userid;
        email = email.toLocaleLowerCase();

        const sqlQuery = 'DELETE FROM users WHERE email = ?';
        const values = [email];

        db.dbConnection.query(sqlQuery, values, (err, result) => {
            if (err) {
                console.log("Error  checking user", err);
                return res.status(500).send({fetch: false, error: "Error checking users database"});
            }
            // Effected row check point
            if (result.affectedRows === 0) {
                return res.status(404).send({ fetch: false, message: 'User not found' });
            }

            return res.status(200).send({ fetch: true, message: 'User has been deleted successfully' });
        });

    } catch (err) {
        console.log(err);
        return res.status(500).send({fetch: false, message: err.message });
    }
});


module.exports = router;