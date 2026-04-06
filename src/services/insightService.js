const Groq = require("groq-sdk");
const env = require('../config/env');

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const generateInsight = async (financialData) => {
  // Guard against empty or missing data
  if (
    !financialData ||
    !financialData.summary ||
    (financialData.summary.totalIncome === 0 &&
      financialData.summary.totalExpenses === 0 &&
      (!financialData.categoryBreakdown || financialData.categoryBreakdown.length === 0))
  ) {
    return "Not enough financial data to generate insights. Please add some income and expense records first.";
  }

  if (!env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not configured.");
    throw new Error("AI insights service is not configured. Please set the GROQ_API_KEY environment variable.");
  }

  try {
    const prompt = `
You are a smart financial advisor. Here is the financial summary for a user:

Total Income: ${financialData.summary.totalIncome}
Total Expenses: ${financialData.summary.totalExpenses}
Net Balance: ${financialData.summary.netBalance}
Category Breakdown: ${JSON.stringify(financialData.categoryBreakdown)}

Provide 3 to 5 concise, actionable financial insights. Keep it short and professional.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      // ✅ UPDATED WORKING MODEL
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 300,
    });

    return (
      chatCompletion.choices?.[0]?.message?.content ||
      "No insights available at the moment."
    );

  } catch (error) {
    console.error("Error generating insights from Groq:", error);

    if (error.status === 401 || error.message?.includes('auth')) {
      throw new Error("AI service authentication failed. Please verify the GROQ_API_KEY.");
    }

    if (error.status === 429) {
      throw new Error("AI service rate limit exceeded. Please try again in a few minutes.");
    }

    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENETUNREACH'
    ) {
      throw new Error("Cannot reach the AI service. Please check your network connection.");
    }

    if (error.message?.includes("model_decommissioned")) {
      throw new Error("The AI model is outdated. Please update to a supported model.");
    }

    throw new Error("Unable to generate insights at this time.");
  }
};

module.exports = {
  generateInsight,
};