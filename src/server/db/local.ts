const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Scripts that wipe data call this first, so they never touch a hosted database.
export function assertLocalDatabase(url: string | undefined): string {
  if (!isLocalDatabaseUrl(url)) {
    throw new Error("Refusing to run: DATABASE_URL is not a local database. Use npm run db:bootstrap for hosted databases.");
  }
  return url!;
}
