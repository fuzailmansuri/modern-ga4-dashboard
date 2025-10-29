import { cookies, headers } from "next/headers";
import { DeltaDashboard } from "~/components/DeltaDashboard";
import { auth, signIn } from "~/server/auth";
import type { AnalyticsProperty } from "~/types/analytics";

export default async function DeltaPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
          <div className="mb-3 text-xl font-semibold text-foreground">Channel Delta Explorer</div>
          <p className="mb-4 text-muted-foreground">You need to sign in to analyze channel deltas.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    );
  }

  let properties: AnalyticsProperty[] = [];
  try {
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/analytics/properties?limit=100`, {
      cache: "no-store",
      headers: {
        cookie: (await cookies()).toString(),
      },
    });

    if (!res.ok) {
      let message = `Failed to load properties (HTTP ${res.status})`;
      try {
        const err = (await res.json()) as { message?: string; error?: string };
        if (err?.message) message = err.message;
        else if (err?.error) message = err.error;
      } catch {
        // ignore json parse errors
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mb-2 text-xl font-semibold text-foreground">Channel Delta Explorer</div>
            <p className="mb-4 text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground/70">
              Ensure you are signed in with a Google account that has GA4 access and that required env vars are set.
            </p>
          </div>
        </div>
      );
    }

    const data = (await res.json()) as { properties?: AnalyticsProperty[] };
    properties = data.properties ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-2 text-xl font-semibold text-foreground">Channel Delta Explorer</div>
          <p className="mb-4 text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground/70">Check API credentials and network connectivity.</p>
        </div>
      </div>
    );
  }

  return <DeltaDashboard properties={properties} />;
}
