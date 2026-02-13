'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project, Task, ProcessingLog, ActivityLog, ActivityType } from './types';
import { db } from './firebase';
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';

interface SecondBrainStore {
    projects: Project[];
    tasks: Task[];
    logs: ProcessingLog[];
    activities: ActivityLog[];

    // Actions
    addLog: (text: string) => void;
    updateLog: (id: string, updates: Partial<ProcessingLog>) => void;

    addProject: (project: Omit<Project, 'id' | 'createdAt'>) => string;
    updateProject: (id: string, updates: Partial<Project>) => void;
    addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string;
    updateTask: (id: string, updates: Partial<Task>) => void;
    batchUpdateTasks: (updates: { id: string; updates: Partial<Task> }[]) => void;
    reorderTasks: (tasks: Task[]) => void;

    deleteItem: (type: 'project' | 'task' | 'log', id: string) => void;
    addActivity: (type: ActivityType, description: string, detail?: string, metadata?: ActivityLog['metadata']) => void;
    updateActivity: (id: string, updates: Partial<ActivityLog>) => void;
}

const SecondBrainContext = createContext<SecondBrainStore | null>(null);

export function SecondBrainProvider({ children }: { children: React.ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [logs, setLogs] = useState<ProcessingLog[]>([]);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Loading State
    const [loadingState, setLoadingState] = useState({
        projects: true,
        tasks: true,
        logs: true,
        activities: true
    });

    useEffect(() => {
        if (!loadingState.projects && !loadingState.tasks && !loadingState.logs && !loadingState.activities) {
            setIsLoaded(true);
        }
    }, [loadingState]);

    // Safety timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isLoaded) {
                console.warn("Loading timed out, forcing render. Firebase executing might be blocked or slow.");
                setIsLoaded(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [isLoaded]);

    // Subscriptions
    useEffect(() => {
        console.log("Initializing SecondBrain subscriptions...");

        const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
            console.log("Projects loaded:", snap.docs.length);
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Project));
            data.sort((a, b) => b.createdAt - a.createdAt);
            setProjects(data);
            setLoadingState(prev => ({ ...prev, projects: false }));
        }, (error) => {
            console.error("Error loading projects:", error);
            // Optionally set loading to false to unblock app (or handle error UI)
            // setLoadingState(prev => ({ ...prev, projects: false }));
        });

        const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
            console.log("Tasks loaded:", snap.docs.length);
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Task));
            data.sort((a, b) => b.createdAt - a.createdAt);
            setTasks(data);
            setLoadingState(prev => ({ ...prev, tasks: false }));
        }, (error) => {
            console.error("Error loading tasks:", error);
        });

        const unsubLogs = onSnapshot(collection(db, 'logs'), (snap) => {
            console.log("Logs loaded:", snap.docs.length);
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as ProcessingLog));
            data.sort((a, b) => b.timestamp - a.timestamp);
            setLogs(data);
            setLoadingState(prev => ({ ...prev, logs: false }));
        }, (error) => {
            console.error("Error loading logs:", error);
        });

        const unsubActivities = onSnapshot(collection(db, 'activities'), (snap) => {
            console.log("Activities loaded:", snap.docs.length);
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as ActivityLog));
            data.sort((a, b) => b.timestamp - a.timestamp);
            setActivities(data);
            setLoadingState(prev => ({ ...prev, activities: false }));
        }, (error) => {
            console.error("Error loading activities:", error);
        });

        return () => {
            unsubProjects();
            unsubTasks();
            unsubLogs();
            unsubActivities();
        };
    }, []);

    const addLog = async (text: string) => {
        const id = crypto.randomUUID();
        const newLog: ProcessingLog = {
            id,
            originalText: text,
            rewrittenText: '',
            tagsApplied: { time: '15 min', contexts: [] },
            projectMatch: { name: '', confidence: 0, isNew: false },
            status: 'pending',
            timestamp: Date.now(),
        };
        // Optimistic? No need, onSnapshot is fast.
        try {
            await setDoc(doc(db, 'logs', id), newLog);
        } catch (e) {
            console.error("Error adding log:", e);
        }
    };

    const updateLog = async (id: string, updates: Partial<ProcessingLog>) => {
        try {
            await updateDoc(doc(db, 'logs', id), updates);
        } catch (e) {
            console.error("Error updating log:", e);
        }
    };

    const addProject = (project: Omit<Project, 'id' | 'createdAt'>) => {
        const id = crypto.randomUUID();
        const newProject: Project = { ...project, id, createdAt: Date.now() };
        // We return ID immediately, but perform async write
        setDoc(doc(db, 'projects', id), newProject).catch(e => console.error("Error adding project:", e));
        return id;
    };

    const updateProject = (id: string, updates: Partial<Project>) => {
        updateDoc(doc(db, 'projects', id), updates).catch(e => console.error("Error updating project:", e));
    };

    const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
        const id = crypto.randomUUID();
        const newTask: Task = { ...task, id, createdAt: Date.now() };
        setDoc(doc(db, 'tasks', id), newTask).catch(e => console.error("Error adding task:", e));
        return id;
    };

    const updateTask = (id: string, updates: Partial<Task>) => {
        updateDoc(doc(db, 'tasks', id), updates).catch(e => console.error("Error updating task:", e));
    };

    const batchUpdateTasks = async (updates: { id: string; updates: Partial<Task> }[]) => {
        const batch = writeBatch(db);
        updates.forEach(({ id, updates: u }) => {
            const ref = doc(db, 'tasks', id);
            batch.update(ref, u);
        });
        try {
            await batch.commit();
        } catch (e) {
            console.error("Error batch updating tasks:", e);
        }
    };

    const reorderTasks = async (newOrder: Task[]) => {
        // This is tricky with Firestore unless we have an 'order' field.
        // For now, we update the local optimistic state?
        // No, we must persist. 
        // We will assume the 'order' field is being used.
        // We update the order field for ALL tasks in the new list.
        const batch = writeBatch(db);
        newOrder.forEach((task, index) => {
            const ref = doc(db, 'tasks', task.id);
            batch.update(ref, { order: index });
        });
        try {
            await batch.commit();
        } catch (e) {
            console.error("Error reordering tasks:", e);
        }
    };

    const deleteItem = (type: 'project' | 'task' | 'log', id: string) => {
        const collectionName = type === 'project' ? 'projects' : type === 'task' ? 'tasks' : 'logs';
        deleteDoc(doc(db, collectionName, id)).catch(e => console.error("Error deleting item:", e));

        if (type === 'task') {
            // We can't easily cascade delete via client without query
            // Ideally use Cloud Functions for this.
            // For now, we leave orphaned activities or try to query them?
            // Skipping cascade delete for activities for simplicity/security.
        }
    };

    const addActivity = (type: ActivityType, description: string, detail?: string, metadata?: ActivityLog['metadata']) => {
        const id = crypto.randomUUID();
        const newActivity: ActivityLog = {
            id,
            type,
            description,
            detail,
            metadata,
            timestamp: Date.now()
        };
        setDoc(doc(db, 'activities', id), newActivity).catch(e => console.error("Error adding activity:", e));
    };

    const updateActivity = (id: string, updates: Partial<ActivityLog>) => {
        updateDoc(doc(db, 'activities', id), updates).catch(e => console.error("Error updating activity:", e));
    };

    const value = {
        projects,
        tasks,
        logs,
        activities,
        addLog,
        updateLog,
        addProject,
        updateProject,
        addTask,
        updateTask,
        batchUpdateTasks,
        reorderTasks,
        deleteItem,
        addActivity,
        updateActivity
    };

    // We can render children immediately but with empty data, or wait. 
    // Showing empty state might flash.
    // Let's return children always, but maybe a loading spinner?
    // The previous implementation waited for 'isLoaded'.
    if (!isLoaded) {
        // Minimal loading screen
        return <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-500">Loading Second Brain...</div>;
    }

    return (
        <SecondBrainContext.Provider value={value}>
            {children}
        </SecondBrainContext.Provider>
    );
}

export function useSecondBrain() {
    const context = useContext(SecondBrainContext);
    if (!context) {
        throw new Error('useSecondBrain must be used within a SecondBrainProvider');
    }
    return context;
}
