const insightService = require('../src/services/insightService');

jest.mock('groq-sdk', () => {
  const mCreate = jest.fn();
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mCreate
        }
      }
    };
  });
});

// To access the mock in tests without hoisting issues, we have to require it and navigate to it:
const Groq = require('groq-sdk');
let createMock;
beforeEach(() => {
  createMock = new Groq().chat.completions.create;
});

describe('insightService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInsight', () => {
    it('returns generated insight content', async () => {
      createMock.mockResolvedValueOnce({
        choices: [
          { message: { content: 'Reduce spending on dining out.' } }
        ]
      });

      const financialData = {
        summary: { totalIncome: 5000, totalExpenses: 3000, netBalance: 2000 },
        categoryBreakdown: [{ category: 'Food', total: 3000 }]
      };

      const result = await insightService.generateInsight(financialData);
      expect(result).toBe('Reduce spending on dining out.');
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it('returns fallback string if choices are empty', async () => {
      createMock.mockResolvedValueOnce({ choices: [] });

      const financialData = {
        summary: { totalIncome: 0, totalExpenses: 0, netBalance: 0 },
        categoryBreakdown: []
      };

      const result = await insightService.generateInsight(financialData);
      expect(result).toBe('No insights available at the moment.');
    });

    it('throws error if API call fails', async () => {
      createMock.mockRejectedValueOnce(new Error('Network error'));

      const financialData = {
        summary: { totalIncome: 0, totalExpenses: 0, netBalance: 0 },
        categoryBreakdown: []
      };

      await expect(insightService.generateInsight(financialData)).rejects.toThrow('Unable to generate insights at this time.');
    });
  });
});
