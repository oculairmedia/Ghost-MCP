// Minimal in-memory event store for MCP sessions

export class InMemoryEventStore {
  constructor() {
    this.events = [];
  }
  add(event) {
    this.events.push(event);
  }
  getAll() {
    return this.events;
  }
  clear() {
    this.events = [];
  }
}