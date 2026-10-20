/**
 * Conversation Context Service
 * Stores session-specific context in memory
 */
class ContextService {
  constructor() {
    this.sessions = new Map();
    // Clear expired sessions periodically (e.g. older than 30 mins)
    setInterval(() => this.cleanupSessions(), 15 * 60 * 1000);
  }

  /**
   * Get context or initialize a new one
   */
  getContext(sessionId) {
    if (!sessionId) {
      return this.createDefaultContext();
    }
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        context: this.createDefaultContext(),
        lastActive: Date.now()
      });
    } else {
      const session = this.sessions.get(sessionId);
      session.lastActive = Date.now();
    }
    return this.sessions.get(sessionId).context;
  }

  /**
   * Update session context with new details
   */
  updateContext(sessionId, updates = {}) {
    if (!sessionId) return;
    const current = this.getContext(sessionId);
    Object.assign(current, updates);
    
    // Make sure lastActive is updated
    if (this.sessions.has(sessionId)) {
      this.sessions.get(sessionId).lastActive = Date.now();
    }
  }

  /**
   * Clear context
   */
  clearContext(sessionId) {
    if (!sessionId) return;
    this.sessions.delete(sessionId);
  }

  /**
   * Create standard context dictionary
   */
  createDefaultContext() {
    return {
      lastDepartment: null, // 'CSE', 'IT', 'AIDS', etc.
      lastCompany: null,    // 'Zoho', 'TCS', etc.
      lastBatch: '2023',    // Default batch
      lastIntent: null      // Last triggered intent name
    };
  }

  /**
   * Remove sessions inactive for more than 30 minutes
   */
  cleanupSessions() {
    const now = Date.now();
    const expiryTime = 30 * 60 * 1000; // 30 minutes
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now - sessionData.lastActive > expiryTime) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export default new ContextService();
