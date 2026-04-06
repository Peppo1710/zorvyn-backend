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
const recordController = require('../src/modules/records/recordController');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('recordController transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(clientMock);

    queryMock.mockImplementation(async (sql, params) => {
      // Transaction boundaries
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return {};
      }

      // Create flow
      if (typeof sql === 'string' && sql.includes('INSERT INTO records')) {
        return { rows: [{ id: 'rec1', user_id: params[0] }] };
      }

      if (typeof sql === 'string' && sql.includes('INSERT INTO audit_logs')) {
        return {};
      }

      // Update flow
      if (typeof sql === 'string' && sql.includes('SELECT * FROM records')) {
        return { rows: [{ id: 'rec1', user_id: 'user1', is_deleted: false }] };
      }

      if (typeof sql === 'string' && sql.includes('UPDATE records') && sql.includes('RETURNING *')) {
        return { rows: [{ id: 'rec1', user_id: 'user1', amount: 99 }] };
      }

      // Delete flow soft delete
      if (typeof sql === 'string' && sql.includes('UPDATE records SET is_deleted = true')) {
        return {};
      }

      return {};
    });
  });

  it('createRecord: BEGIN -> insert record -> insert audit -> COMMIT', async () => {
    const req = {
      user: { id: 'user1', role: 'analyst' },
      body: {
        amount: 10,
        type: 'income',
        category: 'Salary',
        date: '2026-04-01',
        notes: 'n1',
      },
    };

    const res = makeRes();
    const next = jest.fn();

    await recordController.createRecord(req, res, next);

    expect(next).not.toHaveBeenCalled();

    const sqlCalls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqlCalls[0]).toBe('BEGIN');
    expect(sqlCalls[sqlCalls.length - 1]).toBe('COMMIT');

    // Audit log insert params: [userId, action, resourceType, resourceId]
    const auditCall = queryMock.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO audit_logs'));
    expect(auditCall).toBeTruthy();
    expect(auditCall[1]).toEqual(['user1', 'CREATE', 'record', 'rec1']);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'rec1', user_id: 'user1' });
  });

  it('updateRecord: BEGIN -> select record -> update record -> insert audit -> COMMIT', async () => {
    const req = {
      params: { id: 'rec1' },
      user: { id: 'user1', role: 'analyst' },
      body: { amount: 99, notes: 'updated' },
    };

    const res = makeRes();
    const next = jest.fn();

    await recordController.updateRecord(req, res, next);

    expect(next).not.toHaveBeenCalled();

    const sqlCalls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqlCalls[0]).toBe('BEGIN');
    expect(sqlCalls[sqlCalls.length - 1]).toBe('COMMIT');

    const auditCall = queryMock.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO audit_logs'));
    expect(auditCall[1]).toEqual(['user1', 'UPDATE', 'record', 'rec1']);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'rec1', user_id: 'user1', amount: 99 });
  });

  it('deleteRecord: BEGIN -> select record -> soft delete -> insert audit -> COMMIT', async () => {
    const req = {
      params: { id: 'rec1' },
      user: { id: 'user1', role: 'analyst' },
      body: {},
    };

    const res = makeRes();
    const next = jest.fn();

    await recordController.deleteRecord(req, res, next);

    expect(next).not.toHaveBeenCalled();

    const sqlCalls = queryMock.mock.calls.map((c) => c[0]);
    expect(sqlCalls[0]).toBe('BEGIN');
    expect(sqlCalls[sqlCalls.length - 1]).toBe('COMMIT');

    const auditCall = queryMock.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO audit_logs'));
    expect(auditCall[1]).toEqual(['user1', 'DELETE', 'record', 'rec1']);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Record soft-deleted successfully' });
  });
});

