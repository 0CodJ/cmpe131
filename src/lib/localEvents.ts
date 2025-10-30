export type LocalEvent = {
  id: string;
  title: string;
  description: string;
  month: number;
  day: number;
  year: number;
  category: string;
  created_at: string;
  created_by: string; // user id
  approved: boolean;
};

const EVENTS_KEY = 'local_events_v1';

function loadAll(): LocalEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalEvent[];
  } catch {
    return [];
  }
}

function saveAll(events: LocalEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function addEvent(input: Omit<LocalEvent, 'id' | 'created_at' | 'approved'>): LocalEvent {
  const events = loadAll();
  const evt: LocalEvent = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    approved: false,
  };
  events.push(evt);
  saveAll(events);
  return evt;
}

export function listApproved(): LocalEvent[] {
  return loadAll().filter(e => e.approved);
}

export function listPending(): LocalEvent[] {
  return loadAll().filter(e => !e.approved);
}

export function approveEvent(eventId: string) {
  const events = loadAll();
  const updated = events.map(e => (e.id === eventId ? { ...e, approved: true } : e));
  saveAll(updated);
}


