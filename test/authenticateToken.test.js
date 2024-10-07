const jwt = require('jsonwebtoken');
const db = require('../Models/dbConnection');
const authenticateToken = require('../Middleware/authMiddleware');

describe('authenticateToken middleware', () => {
    let req;
    let res;
    let nextFunction;

    beforeEach(() => {
        // Create mock request and response objects
        req = {
            headers: {},
            user: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        nextFunction = jest.fn();
        jest.clearAllMocks();
    });

    test('should call next() if token is valid and user exists', () => {
        const mockToken = jwt.sign({ email: 'test@example.com' }, process.env.SECRET_KEY);
        req.headers['authorization'] = `Bearer ${mockToken}`;

        // Mock the db query response
        db.dbConnection.query = jest.fn((sql, params, callback) => {
            callback(null, { affectedRows: 1 }); 
        });

        authenticateToken(req, res, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(req.user).toEqual({ email: 'test@example.com' });
    });

    test('should return 401 if token is missing', () => {
        authenticateToken(req, res, nextFunction);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({ message: 'Access denied. Token is required.' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should return 403 if token is invalid', () => {
        req.headers['authorization'] = 'Bearer invalidToken';
        jwt.verify = jest.fn(() => { throw new Error('Invalid token'); });

        authenticateToken(req, res, nextFunction);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: 'Forbidden - Invalid or expired token.', expired: true });
        expect(nextFunction).not.toHaveBeenCalled();
    });
});
