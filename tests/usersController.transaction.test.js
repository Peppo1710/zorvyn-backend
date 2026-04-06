const mockConnect = jest.fn();
const queryMock = jest.fn();

const clientMock = {
  query: queryMock,
  release: jest.fn(),
};

jest.mock('../src/config/db', () => ({
  pool: {
    connect: mockConnect,
  },
}));

const { pool } = require('../src/config/db');
const usersController = require('../src/modules/users/usersController');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('usersController transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(clientMock);

    queryMock.mockImplementation(async (sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};

      if (typeof sql === 'string' && sql.includes('SELECT id, email, role, status, created_at FROM users WHERE id')) {
        return { rows: [{ id: 'target1', email: 'user1@example.com', role: 'viewer', status: 'active', created_at: new Date() }] };
      }

      if (typeof sql === 'string' && sql.includes('UPDATE users')) {
        return {
          rows: [{ id: 'target1', email: 'user1@example.com', role: params[0] ?? 'analyst', status: params[1] ?? 'inactive', created_at: new Date() }],
        };
      }

      if (typeof sql === 'string' && sql.includes('INSERT INTO audit_logs')) {
        return {};
      }

      return {};
    });
  });

  it('updateUser: BEGIN -> select -> update -> insert audit -> COMMIT', async () => {
    const req = {
      params: { id: 'target1' },
      user: { id: 'admin1', role: 'admin' },
      body: { role: 'analyst', status: 'inactive' },
    };

    const res = makeRes();
    const next = jest.fn();

    await usersController.updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();

    const sqlCalls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqlCalls[0]).toBe('BEGIN');
    expect(sqlCalls[sqlCalls.length - 1]).toBe('COMMIT');

    const auditCall = queryMock.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO audit_logs'));
    expect(auditCall[1]).toEqual(['admin1', 'UPDATE', 'user', 'target1']);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'target1', role: 'analyst', status: 'inactive' })
    );
  });

  it('updateUser: rolls back and returns 404 when user does not exist', async () => {
    queryMock.mockImplementation(async (sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (sql === 'ROLLBACK') return {};

      if (typeof sql === 'string' && sql.includes('SELECT id, email, role, status, created_at FROM users WHERE id')) {
        return { rows: [] };
      }

      return {};
    });

    const req = {
      params: { id: 'missing1' },
      user: { id: 'admin1', role: 'admin' },
      body: { role: 'analyst' },
    };

    const res = makeRes();
    const next = jest.fn();

    await usersController.updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();

    const sqlCalls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqlCalls).toContain('ROLLBACK');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not Found', message: 'User not found' });
  });
});

