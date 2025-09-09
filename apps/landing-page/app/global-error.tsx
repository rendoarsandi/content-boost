'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary mb-4">500</h1>
            <h2 className="text-2xl font-semibold mb-2">Something went wrong!</h2>
            <p className="text-muted-foreground mb-8">
              An error occurred while rendering this page.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}