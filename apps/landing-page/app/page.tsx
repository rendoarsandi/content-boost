import { Button } from '@repo/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Creator Promotion Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis
        </p>
        <Button>Get Started</Button>
      </div>
    </main>
  );
}