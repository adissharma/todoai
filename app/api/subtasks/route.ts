import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
    if (!apiKey) {
        return NextResponse.json(
            { error: 'GEMINI_API_KEY is not defined' },
            { status: 500 }
        );
    }

    try {
        const { title, context } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const SYSTEM_PROMPT = `
You are a GTD Task Decomposer.
Your goal is to break down a main task into smaller, actionable steps (subtasks).

INPUT:
Task Title: "${title}"
Context: "${context || 'None'}"

INSTRUCTIONS:
1. Break this task into 3-6 logical, sequential subtasks.
2. Each subtask must be actionable strings starting with a verb.
3. Keep them simple and direct.

OUTPUT JSON FORMAT:
{
  "subtasks": ["string", "string", "string"]
}
`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(SYSTEM_PROMPT);
        const content = result.response.text();

        if (!content) {
            throw new Error('No content returned from AI');
        }

        const parsedResult = JSON.parse(content);

        return NextResponse.json(parsedResult);
    } catch (error) {
        console.error('AI Subtask Generation Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate subtasks' },
            { status: 500 }
        );
    }
}
