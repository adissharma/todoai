const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function main() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels on the standard client in some versions, 
    // but we can try to hit the API manually or use the model to check.
    // Actually, let's just try to generate content with a very basic model name "gemini-pro"
    // If that fails, we can try to fetch the list endpoint using fetch.

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Available Models:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error fetching models:', e);
    }
}

main();
