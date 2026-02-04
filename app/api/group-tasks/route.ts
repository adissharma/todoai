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
        const { tasks, projectName, existingGroups } = await request.json();

        if (!tasks || !Array.isArray(tasks)) {
            return NextResponse.json({ error: 'Tasks array is required' }, { status: 400 });
        }

        // Prepare simplified task list for the prompt
        const taskListString = tasks.map((t: any) => `- ID: ${t.id}, Title: "${t.title}"`).join('\n');
        const existingGroupsString = existingGroups && existingGroups.length > 0
            ? `EXISTING CATEGORIES: ${existingGroups.join(', ')}`
            : 'EXISTING CATEGORIES: None (You must create new ones)';

        const SYSTEM_PROMPT = `
You are an expert Project Manager AI.
Your goal is to organize a list of **uncategorized tasks** into logical sub-categories.

CONTEXT:
Project Name: "${projectName || 'Unnamed Project'}"
Tasks to Organize: ${tasks.length}

${existingGroupsString}

TASKS:
${taskListString}

INSTRUCTIONS:
1. **Analyze the tasks** and try to assign them to one of the **EXISTING CATEGORIES** first.
2. If a task clearly fits into an existing category, use that EXACT category name.
3. If a task DOES NOT fit into any existing category, create a NEW, descriptive category name (e.g., "Research", "Development", "Admin").
4. Group EVERY task provided. Do not leave any orphan tasks.
5. Do NOT rename existing categories or re-group tasks that were not provided in the input list.

OUTPUT JSON FORMAT:
{
  "groups": [
    {
      "categoryName": "Existing Or New Label",
      "taskIds": ["id1", "id2"]
    }
  ]
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
        console.error('AI Grouping Error:', error);
        return NextResponse.json(
            { error: 'Failed to group tasks' },
            { status: 500 }
        );
    }
}
