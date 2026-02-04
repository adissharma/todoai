import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not defined' }, { status: 500 });
    }

    try {
        const { message, context } = await request.json();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const SYSTEM_PROMPT = `
You are the AI Assistant for a "Second Brain" Task Manager.
You have access to the user's filtered tasks and projects below.

CONTEXT:
${context}

USER REQUEST: "${message}"

INSTRUCTIONS:
- Answer the user's question based strictly on the provided context.
- If asked to "pull" or "show" tasks, list them clearly.
- If asked to "tidy up", suggest which tasks might be old or low priority (based on the list).
- Be concise, helpful, and friendly.
- If you can't do something (like delete a task physically), explain that you can help identify them but not delete them yet.
`;

        const result = await model.generateContent(SYSTEM_PROMPT);
        const reply = result.response.text();

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('Chat failed:', error);
        return NextResponse.json({ error: 'Chat processing failed' }, { status: 500 });
    }
}
