const cronJobs = require('../src/jobs/cronJobs');
const { pool } = require('../src/config/db');
const logger = require('../src/utils/logger');

jest.mock('../src/config/db', () => ({
  pool: { query: jest.fn() },
}));
const mockQuery = require('../src/config/db').pool.query;

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

describe('cronJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runCleanup', () => {
    it('deletes soft deleted records older than 30 days', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });

      await cronJobs.runCleanup();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM records');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Removed 5 old deleted records.'));
    });
  });

  describe('runAnalyticsSnapshot', () => {
    it('generates and stores daily analytic snapshot', async () => {
      // Mock summary
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_income: '2000.00', total_expenses: '1000.00', record_count: 10 }]
      });

      // Mock categories
      mockQuery.mockResolvedValueOnce({
        rows: [
          { category: 'salary', total: '2000.00' },
          { category: 'rent', total: '1000.00' }
        ]
      });

      // Mock insert/update
      mockQuery.mockResolvedValueOnce({});

      await cronJobs.runAnalyticsSnapshot();

      expect(mockQuery).toHaveBeenCalledTimes(3);
      
      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO analytics_snapshots');
      expect(insertCall[1]).toEqual([
        expect.any(String), // today's date
        2000.00,
        1000.00,
        1000.00, // net balance
        10,
        JSON.stringify({ 
          categoryBreakdown: [
            { category: 'salary', total: 2000.00 },
            { category: 'rent', total: 1000.00 }
          ]
        })
      ]);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Analytics snapshot stored'));
    });
  });
});
