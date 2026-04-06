const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authController = require('../src/modules/auth/authController');

// Mocks
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
}));
const mockQuery = require('../src/config/db').pool.query;

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('returns 409 if email already exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '1' }] }); // user exists

      const req = { body: { email: 'test@example.com', password: 'pass', role: 'viewer' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conflict', message: 'Email already exists' });
    });

    it('successfully registers a user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // user does not exist
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashed_pass');
      
      const mockResult = { id: 'uuid', email: 'test@example.com', role: 'viewer', status: 'active', created_at: new Date() };
      mockQuery.mockResolvedValueOnce({ rows: [mockResult] });

      const req = { body: { email: 'test@example.com', password: 'pass', role: 'viewer' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.register(req, res, next);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 'salt');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: mockResult,
      });
    });

    it('calls next securely on throw', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      const req = { body: { email: 'test@example.com', password: 'pass', role: 'viewer' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    it('returns 401 on missing user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // user not found

      const req = { body: { email: 'test@example.com', password: 'pass' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'Invalid credentials' });
    });

    it('returns 401 on incorrect password', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', password: 'hash' }] });
      bcrypt.compare.mockResolvedValueOnce(false); // bad password

      const req = { body: { email: 'test@example.com', password: 'wrong' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'Invalid credentials' });
    });

    it('returns 403 on inactive account', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', password: 'hash', status: 'inactive' }] });
      bcrypt.compare.mockResolvedValueOnce(true); 

      const req = { body: { email: 'test@example.com', password: 'pass' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', message: 'Account is not active' });
    });

    it('successfully logs in and returns token', async () => {
      const mockUser = { id: 'uuid', email: 'test@example.com', password: 'hash', role: 'viewer', status: 'active' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true); 
      jwt.sign.mockReturnValueOnce('mocked_token');

      const req = { body: { email: 'test@example.com', password: 'pass' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.login(req, res, next);

      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mocked_token',
        user: { id: 'uuid', email: 'test@example.com', role: 'viewer' }
      });
    });

    it('calls next securely on throw', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      const req = { body: { email: 'test@example.com', password: 'pass' } };
      const res = makeRes();
      const next = jest.fn();

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
