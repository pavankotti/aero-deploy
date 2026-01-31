
export interface ProjectResponse {
  status: 'queued' | 'error';
  data: {
    projectSlug: string;
    url: string;
  };
}

export type DeploymentStatus = 'idle' | 'submitting' | 'deploying' | 'finished' | 'error';

export interface LogEntry {
  id: string;
  log: string;
  timestamp: string;
  type: 'info' | 'error' | 'warning';
}