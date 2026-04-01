export function generateVisitorId(): string {
  const stored = localStorage.getItem('rb_visitor_id');
  if (stored) return stored;

  const id = crypto.randomUUID?.() || generateClientId();
  localStorage.setItem('rb_visitor_id', id);
  return id;
}

function generateClientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string | null {
  return sessionStorage.getItem('rb_session_id');
}

export function setSessionId(id: string): void {
  sessionStorage.setItem('rb_session_id', id);
}

export function clearSession(): void {
  sessionStorage.removeItem('rb_session_id');
}
