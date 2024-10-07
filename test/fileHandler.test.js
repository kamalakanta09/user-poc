const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../Middleware/authMiddleware');
const db = require('../Models/dbConnection');

jest.mock('../Models/dbConnection');
jest.mock('jsonwebtoken');
jest.mock('../Middleware/authMiddleware');

describe('POST /api/v1/user/signup', () => {
    const mockUser = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        created_by: 1,
        updated_by: 1,
        role: 'user'
    };

    const token = 'mockToken';
    const refreshToken = 'mockRefreshToken';

    beforeEach(() => {
        jest.clearAllMocks(); 
    });

    it('should return 400 if required fields are missing', async () => {
        const response = await request(app).post('/api/v1/user/signup').send({ firstname: 'John' });
        
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Body params missing');
    });

    it('should return 409 if email already exists in the database', async () => {
        db.dbConnection.query.mockImplementation((sql, values, callback) => {
            if (sql.includes('SELECT')) {
                callback(null, [mockUser]); 
            }
        });

        const response = await request(app).post('/api/v1/user/signup').send(mockUser);

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Already Email ID is present in database');
    });

    it('should return 500 if there is a database error when checking for existing email', async () => {
        db.dbConnection.query.mockImplementation((sql, values, callback) => {
            if (sql.includes('SELECT')) {
                callback(new Error('Database error'), null);
            }
        });

        const response = await request(app).post('/api/v1/user/signup').send(mockUser);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    it('should create a user and return tokens if everything is valid', async () => {
        db.dbConnection.query.mockImplementation((sql, values, callback) => {
            if (sql.includes('SELECT')) {
                callback(null, []); 
            } else if (sql.includes('INSERT')) {
                callback(null, { insertId: 1 }); 
            }
        });

        jwt.sign.mockReturnValueOnce(token).mockReturnValueOnce(refreshToken);

        const response = await request(app).post('/api/v1/user/signup').send(mockUser);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Account created successfully');
        expect(response.body.token).toBe(token);
        expect(response.body.refreshToken).toBe(refreshToken);
    });

    it('should return 500 if there is an unhandled error', async () => {
        db.dbConnection.query.mockImplementation(() => {
            throw new Error('Unhandled error');
        });

        const response = await request(app).post('/api/v1/user/signup').send(mockUser);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Unhandled error');
    });
});

describe('POST /api/v1/user/signin', () => {
    let mockQuery;

    beforeEach(() => {
        // Mock the dbConnection.query function before each test
        mockQuery = db.dbConnection.query.mockImplementation((query, values, callback) => {
            callback(null, []);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return 400 if required fields are missing', async () => {
        const response = await request(app)
            .post('/api/v1/user/signin')
            .send({
                email: '', 
                password: '',
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Body params missing');
    });

    test('should return 409 if invalid credentials are provided', async () => {
        // Mock query to simulate no matching users found (invalid credentials)
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(null, []);
        });

        const response = await request(app)
            .post('/api/v1/user/signin')
            .send({
                email: 'invalid@example.com',
                password: 'wrongpassword',
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('Invalid username or password');
    });

    test('should return 500 if there is a database error when checking user credentials', async () => {
        // Mock query to simulate a database error
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(new Error('Database error'), null);
        });

        const response = await request(app)
            .post('/api/v1/user/signin')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should return 200 and tokens if login is successful', async () => {
        // Mock query to simulate a successful login (matching user found)
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(null, [{ email: 'test@example.com' }]);
        });

        // Mock token generation
        jwt.sign.mockReturnValueOnce('mockToken').mockReturnValueOnce('mockRefreshToken');

        const response = await request(app)
            .post('/api/v1/user/signin')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.token).toBe('mockToken');
        expect(response.body.refreshToken).toBe('mockRefreshToken');
    });

    test('should return 500 if there is an unhandled error in the try-catch block', async () => {
        // Simulate an unhandled error by throwing in the mock query
        mockQuery.mockImplementationOnce(() => {
            throw new Error('Unhandled error');
        });

        const response = await request(app)
            .post('/api/v1/user/signin')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Unhandled error');
    });
});

describe('GET /api/v1/user/all', () => {
    let mockQuery;

    beforeEach(() => {
        // Mock the dbConnection.query function before each test
        mockQuery = db.dbConnection.query.mockImplementation((query, values, callback) => {
            callback(null, []);
        });
        // Mock the authenticateToken middleware to pass the request
        authenticateToken.mockImplementation((req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return 200 with user data and pagination', async () => {
        // Mock query to simulate users found in the database
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(null, [{ id: 1, email: 'test@example.com' }, { id: 2, email: 'test2@example.com' }]);
        });

        const response = await request(app)
            .get('/api/v1/user/all?page=1&limit=2')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(200);
        expect(response.body.fetch).toBe(true);
        expect(response.body.data.length).toBe(2);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(2);
    });

    test('should return 409 if no users found in the database', async () => {
        // Mock query to simulate no users found
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(null, []);
        });

        const response = await request(app)
            .get('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('No users found in the database');
    });

    test('should return 500 if there is a database error', async () => {
        // Mock query to simulate a database error
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(new Error('Database error'), null);
        });

        const response = await request(app)
            .get('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should handle pagination defaults', async () => {
        // Mock query to simulate users found in the database with default pagination (page 1, limit 10)
        mockQuery.mockImplementationOnce((query, values, callback) => {
            callback(null, [{ id: 1, email: 'test@example.com' }]);
        });

        const response = await request(app)
            .get('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(200);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(10);
    });

    test('should return 500 if there is an unhandled error in the try-catch block', async () => {
        // Simulate an unhandled error by throwing an error in the mock query
        mockQuery.mockImplementationOnce(() => {
            throw new Error('Unhandled error');
        });

        const response = await request(app)
            .get('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Unhandled error');
    });

    test('should return 401 if token is missing or invalid', async () => {
        // Mock the authenticateToken middleware to reject unauthorized requests
        authenticateToken.mockImplementationOnce((req, res, next) => res.status(401).send({ message: 'Unauthorized' }));

        const response = await request(app)
            .get('/api/v1/user/all'); // No Authorization header

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});

describe('GET /api/v1/user/:userid', () => {
    beforeEach(() => {
        // Mock the authenticateToken middleware to pass the request
        authenticateToken.mockImplementation((req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return 200 with user data if user is found', async () => {
        const mockUser = { id: 1, email: 'test@example.com' };

        // Mock query to simulate user found in the database
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, [mockUser]);
        });

        const response = await request(app)
            .get('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(200);
        expect(response.body.email).toBe(mockUser.email);
        expect(response.body.id).toBe(mockUser.id);
    });

    test('should return 409 if user is not found', async () => {
        // Mock query to simulate user not found in the database
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, []);
        });

        const response = await request(app)
            .get('/api/v1/user/nonexistent@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('User id does not present, please signup !!!');
    });

    test('should return 500 if there is a database error', async () => {
        // Mock query to simulate a database error
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(new Error('Database error'), null);
        });

        const response = await request(app)
            .get('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should return 500 if there is an unhandled error in the try-catch block', async () => {
        // Simulate an unhandled error by throwing an error in the mock query
        db.dbConnection.query.mockImplementationOnce(() => {
            throw new Error('Unhandled error');
        });

        const response = await request(app)
            .get('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Unhandled error');
    });

    test('should return 401 if token is missing or invalid', async () => {
        // Mock the authenticateToken middleware to reject unauthorized requests
        authenticateToken.mockImplementationOnce((req, res, next) => res.status(401).send({ message: 'Unauthorized' }));

        const response = await request(app)
            .get('/api/v1/user/test@example.com'); // No Authorization header

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});

describe('PUT /api/v1/user/:userid', () => {
    beforeEach(() => {
        // Mock the authenticateToken middleware to pass the request
        authenticateToken.mockImplementation((req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should update user fields and return 200', async () => {
        const mockUser = { id: 1, email: 'test@example.com' };

        // Mock the initial user query
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, [mockUser]); 
        });

        // Mock the update query
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, { affectedRows: 1 }); 
        });

        const response = await request(app)
            .put('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`)
            .send({
                firstname: 'John',
                lastname: 'Doe',
                updated_by: 'admin'
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.fetch).toBe(true);
        expect(response.body.message).toBe('User record updated successfully');
    });

    test('should return 409 if user does not exist', async () => {
        // Mock the initial user query to simulate user not found
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, []); 
        });

        const response = await request(app)
            .put('/api/v1/user/nonexistent@example.com')
            .set('Authorization', `Bearer validToken`)
            .send({
                firstname: 'John',
                lastname: 'Doe',
                updated_by: 'admin'
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe('User id does not present, please signup !!!');
    });

    test('should return 400 if no fields to update', async () => {
        const mockUser = { id: 1, email: 'test@example.com' };

        // Mock the initial user query
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, [mockUser]); 
        });

        const response = await request(app)
            .put('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`)
            .send({}); 

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('No fields to update');
    });

    test('should return 500 if there is a database error during user check', async () => {
        // Mock the initial user query to simulate a database error
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(new Error('Database error'), null);
        });

        const response = await request(app)
            .put('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`)
            .send({
                firstname: 'John',
                lastname: 'Doe',
                updated_by: 'admin'
            });

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should return 500 if there is a database error during update', async () => {
        const mockUser = { id: 1, email: 'test@example.com' };

        // Mock the initial user query
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(null, [mockUser]); 
        });

        // Mock the update query to simulate a database error
        db.dbConnection.query.mockImplementationOnce((query, values, callback) => {
            callback(new Error('Database update error'), null);
        });

        const response = await request(app)
            .put('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`)
            .send({
                firstname: 'John',
                lastname: 'Doe',
                updated_by: 'admin'
            });

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should return 401 if token is missing or invalid', async () => {
        // Mock the authenticateToken middleware to reject unauthorized requests
        authenticateToken.mockImplementationOnce((req, res, next) => res.status(401).send({ message: 'Unauthorized' }));

        const response = await request(app)
            .put('/api/v1/user/test@example.com') 

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});

describe('DELETE /api/v1/user/all', () => {
    beforeEach(() => {
        // Mock the authenticateToken middleware to pass the request
        authenticateToken.mockImplementation((req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should delete all users and return 200', async () => {
        // Mock the query to simulate successful deletion
        db.dbConnection.query.mockImplementation((query, callback) => {
            callback(null, { affectedRows: 10 }); 
        });

        const response = await request(app)
            .delete('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(200);
        expect(response.body.fetch).toBe(true);
        expect(response.body.message).toBe('All users have been deleted successfully');
    });

    test('should return 500 if there is a database error during deletion', async () => {
        // Mock the query to simulate a database error
        db.dbConnection.query.mockImplementation((query, callback) => {
            callback(new Error('Database error'), null);
        });

        const response = await request(app)
            .delete('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should return 500 if there is an unhandled error in the try-catch block', async () => {
        // Simulate an unhandled error by throwing an error
        db.dbConnection.query.mockImplementation(() => {
            throw new Error('Unhandled error');
        });

        const response = await request(app)
            .delete('/api/v1/user/all')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Unhandled error');
    });

    test('should return 401 if token is missing or invalid', async () => {
        // Mock the authenticateToken middleware to reject unauthorized requests
        authenticateToken.mockImplementationOnce((req, res, next) => res.status(401).send({ message: 'Unauthorized' }));

        const response = await request(app)
            .delete('/api/v1/user/all'); 

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});

describe('DELETE /api/v1/user/:userid', () => {
    beforeEach(() => {
        // Mock the authenticateToken middleware to pass the request
        authenticateToken.mockImplementation((req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should delete a user and return 200', async () => {
        // Mock the query to simulate successful user deletion
        db.dbConnection.query.mockImplementation((query, values, callback) => {
            callback(null, { affectedRows: 1 }); // Simulate that one user was deleted
        });

        const response = await request(app)
            .delete('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(200);
        expect(response.body.fetch).toBe(true);
        expect(response.body.message).toBe('User has been deleted successfully');
    });

    test('should return 404 if user not found', async () => {
        // Mock the query to simulate user not found
        db.dbConnection.query.mockImplementation((query, values, callback) => {
            callback(null, { affectedRows: 0 }); // Simulate that no user was deleted
        });

        const response = await request(app)
            .delete('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    test('should return 500 if there is a database error during deletion', async () => {
        // Mock the query to simulate a database error
        db.dbConnection.query.mockImplementation((query, values, callback) => {
            callback(new Error('Database error'), null);
        });

        const response = await request(app)
            .delete('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Error checking users database');
    });

    test('should return 500 if there is an unhandled error in the try-catch block', async () => {
        // Simulate an unhandled error by throwing an error
        db.dbConnection.query.mockImplementation(() => {
            throw new Error('Unhandled error');
        });

        const response = await request(app)
            .delete('/api/v1/user/test@example.com')
            .set('Authorization', `Bearer validToken`);

        expect(response.statusCode).toBe(500);
        expect(response.body.message).toBe('Unhandled error');
    });

    test('should return 401 if token is missing or invalid', async () => {
        // Mock the authenticateToken middleware to reject unauthorized requests
        authenticateToken.mockImplementationOnce((req, res, next) => res.status(401).send({ message: 'Unauthorized' }));

        const response = await request(app)
            .delete('/api/v1/user/test@example.com'); // No Authorization header

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });
});