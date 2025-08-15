import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@repo/ui';
import {
  Target,
  Bot,
  BarChart,
  PenSquare,
  DollarSign,
  Share2,
  CheckCircle,
  HelpCircle,
  Briefcase,
  Mail,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

// Helper component for Feature Cards for better reusability
const FeatureCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="bg-card/50 hover:bg-card/90 transition-colors duration-300 ease-in-out shadow-lg hover:shadow-xl">
    <CardHeader className="flex flex-row items-center gap-4 pb-4">
      {icon}
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{children}</p>
    </CardContent>
  </Card>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link href="#" className="text-xl font-bold text-primary">
            ContentBoost
          </Link>
          <nav className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="https://auth.domain.com">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="https://auth.domain.com">Daftar Sekarang</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 sm:py-28 md:py-32 px-4">
          <div className="container text-center">
            <Badge variant="secondary" className="mb-4">
              Platform Promosi Generasi Berikutnya
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
              Tingkatkan Engagement Konten Anda dengan{' '}
              <span className="text-primary">Sistem Pay-Per-View</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Platform promosi konten kreator yang memungkinkan Anda memberikan
              fee kepada promoter berdasarkan views legitimate dengan deteksi
              bot otomatis dan sistem pembayaran harian.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="https://auth.domain.com">
                  Mulai Sebagai Creator
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="https://auth.domain.com">
                  Bergabung Sebagai Promoter
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24 px-4 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Untuk Content Creators
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Tingkatkan reach dan engagement konten Anda dengan mudah
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Target className="w-8 h-8 text-primary" />}
                title="Campaign Management"
              >
                Buat campaign promosi dengan budget dan rate per view yang dapat
                Anda tentukan sendiri.
              </FeatureCard>
              <FeatureCard
                icon={<Bot className="w-8 h-8 text-primary" />}
                title="Bot Detection"
              >
                Sistem deteksi bot otomatis memastikan Anda hanya membayar untuk
                views yang legitimate.
              </FeatureCard>
              <FeatureCard
                icon={<BarChart className="w-8 h-8 text-primary" />}
                title="Real-time Analytics"
              >
                Monitor performa campaign secara real-time dari TikTok dan
                Instagram.
              </FeatureCard>
            </div>

            <div className="text-center mt-20 mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Untuk Promoters
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Hasilkan income dengan mempromosikan konten berkualitas
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<PenSquare className="w-8 h-8 text-primary" />}
                title="Content Editing"
              >
                Akses materi promosi dari creator dan edit sesuai gaya konten
                Anda.
              </FeatureCard>
              <FeatureCard
                icon={<DollarSign className="w-8 h-8 text-primary" />}
                title="Daily Payouts"
              >
                Terima pembayaran harian otomatis berdasarkan views legitimate
                yang transparan.
              </FeatureCard>
              <FeatureCard
                icon={<Share2 className="w-8 h-8 text-primary" />}
                title="Social Integration"
              >
                Hubungkan akun TikTok dan Instagram Anda untuk tracking
                otomatis.
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 px-4 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">
              Siap Meningkatkan Engagement Konten Anda?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Bergabunglah dengan ribuan creator dan promoter yang sudah
              merasakan manfaatnya.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="https://auth.domain.com">Mulai Sekarang Gratis</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 py-12 px-4">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">
                ContentBoost
              </h3>
              <p className="text-muted-foreground">
                Platform promosi konten kreator dengan sistem pay-per-view.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-primary">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-primary">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-primary">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 ContentBoost. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
