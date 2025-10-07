/**
 * Component Cleanup Manager
 * Ensures proper cleanup of timers, intervals, and event listeners across all components
 */

export interface CleanupTask {
  id: s
  type: 'timeout' | 'interval' | 'listener' | 'custom';
  cleanup: () => void;
  component?: string;
  description?: string;
  created: number;
}

export interface CleanupStats {
  totalTasks: number;
  byType: Record<CleanupTask['type'], number>;
  byComponent: Record<string, number>;
  oldestTask: number | null;
  averageAge: number;
}

/**
 * Global cleanup manager for React components
 * Tracks and manages cleanup tasks across the application
 */
export class ComponentCleanupManager {
  private static instance: ComponentCleanupManager | null = null;
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private componentTasks: Map<string, Set<string>> = new Map();

  private constructor() {
    this.setupGlobalCleanup();
  }

  static getInstance(): ComponentCleanupManager {
    if (!this.instance) {
      this.instance = new ComponentCleanupManager();
    }
    return this.instance;
  }

  /**
   * Register a cleanup task
   */
  registerCleanup(
    type: CleanupTask['type'],
    cleanup: () => void,
    component?: string,
    description?: string
  ): string {
    const id = this.generateTaskId();
    const task: CleanupTask = {
      id,
      type,
      cleanup,
      component,
      description,
      created: Date.now()
    };

    this.cleanupTasks.set(id, task);

    // Track by component
    if (component) {
      if (!this.componentTasks.has(component)) {
        this.componentTasks.set(component, new Set());
      }
      this.componentTasks.get(component)!.add(id);
    }

    return id;
  }

  /**
   * Register a timeout for cleanup
   */
  registerTimeout(
    timeoutId: NodeJS.Timeout,
    component?: string,
    description?: string
  ): string {
    return this.registerCleanup(
      'timeout',
      () => clearTimeout(timeoutId),
      component,
      description
    );
  }

  /**
   * Register an interval for cleanup
   */
  registerInterval(
    intervalId: NodeJS.Timeout,
    component?: string,
    description?: string
  ): string {
    return this.registerCleanup(
      'interval',
      () => clearInterval(intervalId),
      component,
      description
    );
  }

  /**
   * Register an event listener for cleanup
   */
  registerEventListener(
    element: EventTarget,
    event: string,
    listener: EventListener,
    component?: string,
    description?: string
  ): string {
    return this.registerCleanup(
      'listener',
      () => element.removeEventListener(event, listener),
      component,
      description || `${event} listener`
    );
  }

  /**
   * Register a custom cleanup function
   */
  registerCustomCleanup(
    cleanup: () => void,
    component?: string,
    description?: string
  ): string {
    return this.registerCleanup('custom', cleanup, component, description);
  }

  /**
   * Unregister a specific cleanup task
   */
  unregisterCleanup(taskId: string): boolean {
    const task = this.cleanupTasks.get(taskId);
    if (!task) return false;

    // Remove from component tracking
    if (task.component) {
      const componentTasks = this.componentTasks.get(task.component);
      if (componentTasks) {
        componentTasks.delete(taskId);
        if (componentTasks.size === 0) {
          this.componentTasks.delete(task.component);
        }
      }
    }

    // Remove the task
    this.cleanupTasks.delete(taskId);
    return true;
  }

  /**
   * Execute and remove a specific cleanup task
   */
  executeCleanup(taskId: string): boolean {
    const task = this.cleanupTasks.get(taskId);
    if (!task) return false;

    try {
      task.cleanup();
      this.unregisterCleanup(taskId);
      return true;
    } catch (error) {
      console.warn(`Cleanup task ${taskId} failed:`, error);
      this.unregisterCleanup(taskId); // Remove even if it failed
      return false;
    }
  }

  /**
   * Clean up all tasks for a specific component
   */
  cleanupComponent(component: string): number {
    const componentTasks = this.componentTasks.get(component);
    if (!componentTasks) return 0;

    let cleaned = 0;
    const taskIds = Array.from(componentTasks);

    for (const taskId of taskIds) {
      if (this.executeCleanup(taskId)) {
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Clean up all tasks of a specific type
   */
  cleanupByType(type: CleanupTask['type']): number {
    let cleaned = 0;
    const tasksToClean = Array.from(this.cleanupTasks.values())
      .filter(task => task.type === type);

    for (const task of tasksToClean) {
      if (this.executeCleanup(task.id)) {
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Clean up old tasks (older than specified age)
   */
  cleanupOldTasks(maxAge: number = 300000): number { // 5 minutes default
    let cleaned = 0;
    const now = Date.now();
    const tasksToClean = Array.from(this.cleanupTasks.values())
      .filter(task => now - task.created > maxAge);

    for (const task of tasksToClean) {
      if (this.executeCleanup(task.id)) {
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Execute all cleanup tasks
   */
  cleanupAll(): number {
    let cleaned = 0;
    const taskIds = Array.from(this.cleanupTasks.keys());

    for (const taskId of taskIds) {
      if (this.executeCleanup(taskId)) {
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats {
    const tasks = Array.from(this.cleanupTasks.values());
    const now = Date.now();

    const stats: CleanupStats = {
      totalTasks: tasks.length,
      byType: { timeout: 0, interval: 0, listener: 0, custom: 0 },
      byComponent: {},
      oldestTask: null,
      averageAge: 0
    };

    let totalAge = 0;

    for (const task of tasks) {
      // Count by type
      stats.byType[task.type]++;

      // Count by component
      if (task.component) {
        stats.byComponent[task.component] = (stats.byComponent[task.component] || 0) + 1;
      }

      // Track age
      const age = now - task.created;
      totalAge += age;

      if (stats.oldestTask === null || task.created < stats.oldestTask) {
        stats.oldestTask = task.created;
      }
    }

    if (tasks.length > 0) {
      stats.averageAge = totalAge / tasks.length;
    }

    return stats;
  }

  /**
   * Get tasks for a specific component
   */
  getComponentTasks(component: string): CleanupTask[] {
    const taskIds = this.componentTasks.get(component);
    if (!taskIds) return [];

    return Array.from(taskIds)
      .map(id => this.cleanupTasks.get(id))
      .filter((task): task is CleanupTask => task !== undefined);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): CleanupTask[] {
    return Array.from(this.cleanupTasks.values());
  }

  /**
   * Check if a component has pending cleanup tasks
   */
  hasComponentTasks(component: string): boolean {
    const tasks = this.componentTasks.get(component);
    return tasks !== undefined && tasks.size > 0;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up global cleanup handlers
   */
  private setupGlobalCleanup(): void {
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        const cleaned = this.cleanupAll();
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} tasks on page unload`);
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      // Also clean up on visibility change (when tab becomes hidden)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          const cleaned = this.cleanupOldTasks(60000); // Clean tasks older than 1 minute
          if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} old tasks on tab hide`);
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Periodic cleanup of old tasks
      const periodicCleanup = setInterval(() => {
        const cleaned = this.cleanupOldTasks();
        if (cleaned > 0) {
          console.log(`Periodic cleanup: removed ${cleaned} old tasks`);
        }
      }, 60000); // Every minute

      // Register the periodic cleanup for cleanup (meta!)
      this.registerInterval(periodicCleanup, 'ComponentCleanupManager', 'Periodic cleanup');
    }
  }

  /**
   * Export cleanup data for debugging
   */
  exportCleanupData(): {
    timestamp: number;
    stats: CleanupStats;
    tasks: Array<Omit<CleanupTask, 'cleanup'>>;
  } {
    return {
      timestamp: Date.now(),
      stats: this.getStats(),
      tasks: this.getAllTasks().map(task => ({
        id: task.id,
        type: task.type,
        component: task.component,
        description: task.description,
        created: task.created
      }))
    };
  }
}

// Export singleton instance
export const componentCleanupManager = ComponentCleanupManager.getInstance();

/**
 * React hook for component cleanup management
 */
export function useComponentCleanup(componentName: string) {
  const manager = ComponentCleanupManager.getInstance();

  const registerTimeout = (timeoutId: NodeJS.Timeout, description?: string) => {
    return manager.registerTimeout(timeoutId, componentName, description);
  };

  const registerInterval = (intervalId: NodeJS.Timeout, description?: string) => {
    return manager.registerInterval(intervalId, componentName, description);
  };

  const registerEventListener = (
    element: EventTarget,
    event: string,
    listener: EventListener,
    description?: string
  ) => {
    return manager.registerEventListener(element, event, listener, componentName, description);
  };

  const registerCustomCleanup = (cleanup: () => void, description?: string) => {
    return manager.registerCustomCleanup(cleanup, componentName, description);
  };

  const cleanup = () => {
    return manager.cleanupComponent(componentName);
  };

  return {
    registerTimeout,
    registerInterval,
    registerEventListener,
    registerCustomCleanup,
    cleanup,
    hasCleanupTasks: () => manager.hasComponentTasks(componentName),
    getCleanupTasks: () => manager.getComponentTasks(componentName)
  };
}
