export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: {
    backend?: string;
    git?: {
      commit?: string;
    };
  };
  system?: {
    uptime?: number;
  };
  services?: {
    supabase?: {
      status: 'healthy' | 'unhealthy';
    };
  };
  resources?: {
    database?: {
      posts?: number;
    };
  };
}

export interface ScraperSource {
  status: 'healthy' | 'degraded' | 'unhealthy';
  postsLast24h: number;
  postsLastHour: number;
  lastSuccess?: string;
  lastError?: string;
  rateLimit?: {
    remaining: number;
    perHour: number;
  };
}

export interface ScraperHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  sources?: {
    rss?: Record<string, ScraperSource>;
    api?: Record<string, ScraperSource>;
  };
  issues?: string[];
}