import Link from "next/link";
import Image from "next/image";
import { auth, signIn, signOut } from "~/server/auth";
import { ThemeToggle } from "~/components/ThemeToggle";

export default async function HomePage() {
  const session = await auth();


  return (
    <main className="min-h-screen bg-background">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            GA4 Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Access and visualize your Google Analytics data
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          {session?.user ? (
            <div className="flex w-full flex-col items-center gap-6">
              <div className="text-center">
                <p className="mb-4 text-xl text-foreground">
                  Welcome back, {session.user.name ?? session.user.email}!
                </p>
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="mx-auto h-16 w-16 rounded-full"
                  />
                )}
              </div>

              <div className="flex w-full flex-col gap-3">
                <Link
                  href="/analytics-data"
         
                  className="w-full rounded border border-border px-6 py-3 text-center font-semibold text-foreground bg-card hover:bg-accent transition-colors"
                >
                  View Analytics
                </Link>

                <form
                  action={async () => {
                    "use server";
                    await signOut();
                  }}
                  className="w-full"
                >
                  <button
                    type="submit"
                    className="w-full rounded border border-border px-6 py-3 font-semibold text-foreground bg-card hover:bg-accent transition-colors"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <form
                action={async () => {
                  "use server";
                  await signIn("google");
                }}
                className="w-full"
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded border border-border px-6 py-3 font-semibold text-foreground bg-card hover:bg-accent transition-colors"
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

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Sign in to access your Google Analytics data and view detailed
                insights about your properties.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}