export type ConfidenceScore = number; // 0.0 to 1.0

export type TimeEstimate = '5 min' | '15 min' | '30 min' | '60 min+';
export type ContextTag = string;

export interface Project {
  id: string;
  name: string; // The Project Name
  outcome: string; // "Successful outcome" description
  status: 'active' | 'completed' | 'archived';
  sections?: string[]; // Persisted list of section names (categories)
  createdAt: number;
}


export type GTDList = 'inbox' | 'next' | 'someday' | 'waiting';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
  checklist?: ChecklistItem[];
}

export interface Task {
  id: string;
  title: string; // Rewritten, actionable title
  description?: string; // Optional rich description
  status: 'todo' | 'done';
  list: GTDList; // STRICT GTD: Where does this live?
  projectId?: string; // Optional link to a project
  category?: string; // Sub-grouping within a project
  priority?: 1 | 2 | 3 | 4; // Priority Level (1=High/Red, 4=None/White)
  scheduledAt?: number; // For Calendar Time-boxing
  subtasks?: Subtask[];
  checklist?: ChecklistItem[]; // Checklist for the main task
  tags: {
    time: TimeEstimate;
    energy?: string;
    contexts: ContextTag[];
  };
  duration?: number; // Duration in minutes
  originalThought: string; // For reference
  order?: number; // Manual sort order (lexorank or simple index)
  createdAt: number;
}

export interface ProcessingLog {
  id: string;
  originalText: string;
  rewrittenText: string;
  tagsApplied: {
    time: TimeEstimate;
    energy?: string;
    contexts: ContextTag[];
  };
  projectMatch: {
    id?: string;
    name: string;
    confidence: number;
    isNew: boolean;
    outcome?: string; // If new
  };
  status: 'pending' | 'success' | 'needs_review' | 'human_intervention_required';
  timestamp: number;
}

export type ActivityType = 'ai_processed' | 'user_update' | 'user_complete' | 'user_create_project';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  description: string; // "AI filed 'Buy Milk' to 'Groceries'"
  detail?: string; // Additional context
  metadata?: {
    taskId?: string;
    projectId?: string;
    projectName?: string;
    originalText?: string;
    refinedText?: string;
  };
  timestamp: number;
}
