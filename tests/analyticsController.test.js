const analyticsController = require('../src/modules/analytics/analyticsController');
const insightService = require('../src/services/insightService');

jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
}));
const mockQuery = require('../src/config/db').pool.query;

jest.mock('../src/services/insightService', () => ({
  generateInsight: jest.fn(),
}));

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('analyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('returns formatted dashboard statistics', async () => {
      // Mock summaryQuery
      mockQuery.mockResolvedValueOnce({
        rows: [
          { type: 'income', total: '500' },
          { type: 'expense', total: '200' },
        ]
      });

      // Mock categoryQuery
      mockQuery.mockResolvedValueOnce({
        rows: [
          { category: 'salary', total: '500' },
          { category: 'food', total: '200' },
        ]
      });

      // Mock trendsQuery
      mockQuery.mockResolvedValueOnce({
        rows: [
          { month: '2026-04', type: 'income', total: '500' },
          { month: '2026-04', type: 'expense', total: '200' },
        ]
      });

      const req = { user: { role: 'viewer', id: 'user1' } };
      const res = makeRes();
      const next = jest.fn();

      await analyticsController.getDashboardStats(req, res, next);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      // Ensures viewer only gets their data
      expect(mockQuery.mock.calls[0][1]).toEqual(['user1']); 

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        summary: {
          totalIncome: 500,
          totalExpenses: 200,
          netBalance: 300,
        },
        categoryBreakdown: [
          { category: 'salary', total: 500 },
          { category: 'food', total: 200 },
        ],
        monthlyTrends: {
          '2026-04': { income: 500, expense: 200 },
        }
      });
    });

    it('handles query failures by passing to next', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB failure'));

      const req = { user: { role: 'admin' } };
      const res = makeRes();
      const next = jest.fn();

      await analyticsController.getDashboardStats(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getInsights', () => {
    it('returns generated insights successfully', async () => {
      // Mock summaryQuery
      mockQuery.mockResolvedValueOnce({
        rows: [
          { type: 'income', total: '1000' },
          { type: 'expense', total: '500' },
        ]
      });

      // Mock categoryQuery
      mockQuery.mockResolvedValueOnce({
        rows: [
          { category: 'freelance', total: '1000' },
          { category: 'utilities', total: '500' },
        ]
      });

      insightService.generateInsight.mockResolvedValueOnce('Buy lower cost groceries.');

      const req = { user: { role: 'viewer', id: 'user1' } };
      const res = makeRes();
      const next = jest.fn();

      await analyticsController.getInsights(req, res, next);

      expect(insightService.generateInsight).toHaveBeenCalledWith({
        summary: {
          totalIncome: 1000,
          totalExpenses: 500,
          netBalance: 500
        },
        categoryBreakdown: [
          { category: 'freelance', total: 1000 },
          { category: 'utilities', total: 500 }
        ]
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ insights: 'Buy lower cost groceries.' });
    });
  });
});
