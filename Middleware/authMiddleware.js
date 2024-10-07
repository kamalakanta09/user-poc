const jwt = require('jsonwebtoken');
const db = require('../Models/dbConnection');
const secretKey = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) {
        return res.status(401).send({ message: 'Access denied. Token is required.' });
    }
    const bearer = bearerHeader.split(" ");
    const token = bearer[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        
        const sqlQuery = 'UPDATE users SET lastActivity = ? WHERE email = ?';
        db.dbConnection.query(sqlQuery, [new Date(), decoded.email], (err, result) => {
            if (err) {
                console.error("Database error during authentication:", err);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).send({ message: 'User not found' });
            }

            req.user = { email: decoded.email };
            next();
        });
    } catch (err) {
        console.error("Authentication error:", err);
        return res.status(403).send({ message: 'Forbidden - Invalid or expired token.', expired: true });
    }
};

module.exports = authenticateToken;
