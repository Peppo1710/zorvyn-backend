const auditController = require('../src/modules/audit/auditController');

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

describe('auditController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      const mockLogs = [{ id: '1', action: 'LOGIN' }, { id: '2', action: 'LOGOUT' }];
      
      mockQuery.mockImplementation(async (sql) => {
        if (sql.includes('SELECT al.id')) {
          return { rows: mockLogs };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ c: 100 }] };
        }
        return { rows: [] };
      });

      const req = { query: { page: '2', limit: '10' } };
      const res = makeRes();
      const next = jest.fn();

      await auditController.listAuditLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockLogs,
        meta: {
          total: 100,
          page: 2,
          limit: 10
        }
      });
    });

    it('applies max limits to pagination', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const req = { query: { page: '-5', limit: '500' } };
      const res = makeRes();
      const next = jest.fn();

      await auditController.listAuditLogs(req, res, next);

      // max 200 limit, min 1 page
      const calls = mockQuery.mock.calls;
      const selectCall = calls.find(c => c[0].includes('SELECT al.id'));
      expect(selectCall[1]).toEqual([200, 0]); // limit 200, offset 0
    });

    it('handles query failures by passing to next', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      const req = { query: {} };
      const res = makeRes();
      const next = jest.fn();

      await auditController.listAuditLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
