const PREFIX = "pos_help_seen";

function key(userId: string, id: string) {
  return `${PREFIX}:${userId}:${id}`;
}

export function helpSeen(userId: string, id: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key(userId, id)) === "1";
}

export function markHelpSeen(userId: string, id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(userId, id), "1");
}

export function clearHelpSeen(userId: string, id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(userId, id));
}
