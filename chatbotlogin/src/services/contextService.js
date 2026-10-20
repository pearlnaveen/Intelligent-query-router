class ContextService {
  constructor() {
    this.sessions = new Map();
    // Clean up inactive sessions after 1 hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  getContext(sessionId) {
    if (!sessionId) return {};
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        lastDepartment: null,
        lastBatch: null,
        lastCompany: null,
        lastIntent: null,
        updatedAt: Date.now()
      });
    }
    return this.sessions.get(sessionId);
  }

  updateContext(sessionId, data) {
    if (!sessionId) return;
    const current = this.getContext(sessionId);
    this.sessions.set(sessionId, {
      ...current,
      ...data,
      updatedAt: Date.now()
    });
  }

  cleanup() {
    const now = Date.now();
    const expiryMs = 2 * 60 * 60 * 1000; // 2 hours
    for (const [id, ctx] of this.sessions.entries()) {
      if (now - ctx.updatedAt > expiryMs) {
        this.sessions.delete(id);
      }
    }
  }
}

export default new ContextService();
