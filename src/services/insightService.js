const Groq = require("groq-sdk");
const env = require('../config/env');

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const generateInsight = async (financialData) => {
  try {
    const prompt = `
      You are a smart financial advisor. Here is the financial summary for a user:
      Total Income: ${financialData.summary.totalIncome}
      Total Expenses: ${financialData.summary.totalExpenses}
      Net Balance: ${financialData.summary.netBalance}
      Category Breakdown: ${JSON.stringify(financialData.categoryBreakdown)}

      Based on this data, provide 3 to 5 concise and actionable financial insights. Keep your response short and professional.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-8b-8192", // Using an open model on Groq
    });

    return chatCompletion.choices[0]?.message?.content || "No insights available at the moment.";
  } catch (error) {
    console.error("Error generating insights from Groq:", error);
    throw new Error("Unable to generate insights at this time.");
  }
};

module.exports = {
  generateInsight,
};
