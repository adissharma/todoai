'use client';

import { useEffect } from 'react';
import { useSecondBrain } from '../lib/store';

const CONFIDENCE_THRESHOLD = 0.6;

export function useProcessor() {
    const { logs, updateLog, addProject, addTask, projects, addActivity } = useSecondBrain();

    useEffect(() => {
        const pendingItem = logs.find((item) => item.status === 'pending');
        if (!pendingItem) return;

        // We use an async function inside the effect
        const processItem = async () => {
            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: pendingItem.originalText,
                        existingProjects: projects // Pass current projects for context
                    }),
                });

                if (!response.ok) {
                    throw new Error('API request failed');
                }

                const result = await response.json();
                const { rewrittenTitle, list, tags, projectMatch } = result;

                // 90% Confidence Gate
                const CONFIDENCE_THRESHOLD = 90;

                if (projectMatch.confidence < CONFIDENCE_THRESHOLD) {
                    updateLog(pendingItem.id, {
                        status: 'needs_review',
                        rewrittenText: rewrittenTitle,
                        tagsApplied: tags,
                        projectMatch: projectMatch
                    });
                    return;
                }

                // High Confidence - AUTO EXECUTE
                let finalProjectId = projectMatch.id;

                if (projectMatch.isNew) {
                    // Create the new project automatically
                    finalProjectId = addProject({
                        name: projectMatch.name,
                        outcome: projectMatch.outcome || 'No outcome defined',
                        status: 'active'
                    });
                }

                // Create the Task
                const newTaskId = addTask({
                    title: rewrittenTitle,
                    status: 'todo',
                    list: list || 'next',
                    projectId: finalProjectId || '', // Should ideally always be matched if high confidence
                    tags: tags,
                    originalThought: pendingItem.originalText
                });

                // LOG ACTIVITY
                addActivity(
                    'ai_processed',
                    `Filed "${rewrittenTitle}" to ${projectMatch.name}`,
                    projectMatch.isNew ? 'Created new project automatically' : undefined,
                    {
                        projectName: projectMatch.name,
                        projectId: finalProjectId,
                        originalText: pendingItem.originalText,
                        refinedText: rewrittenTitle,
                        taskId: newTaskId
                    }
                );

                updateLog(pendingItem.id, {
                    status: 'success',
                    rewrittenText: rewrittenTitle,
                    tagsApplied: tags,
                    projectMatch: projectMatch
                });

            } catch (error) {
                console.error('Processing failed', error);
                updateLog(pendingItem.id, {
                    status: 'needs_review', // Fail safe to review
                    tagsApplied: { energy: 'Neutral', time: '15 min', contexts: [] },
                    projectMatch: { name: 'Error', confidence: 0, isNew: false }
                });
            }
        };

        processItem();

    }, [logs, updateLog, addProject, addTask, projects, addActivity]);
}
