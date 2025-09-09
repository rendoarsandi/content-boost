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
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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

// Helper component for Testimonial Cards
const TestimonialCard = ({
  name,
  role,
  avatar,
  children,
}: {
  name: string;
  role: string;
  avatar: string;
  children: React.ReactNode;
}) => (
  <Card className="bg-card/50 flex flex-col justify-between shadow-lg">
    <CardContent className="pt-6">
      <blockquote className="text-muted-foreground">{children}</blockquote>
    </CardContent>
    <CardHeader className="flex flex-row items-center gap-4 pt-4">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="font-semibold">{name.charAt(0)}</span>
      </div>
      <div>
        <CardTitle className="text-base">{name}</CardTitle>
        <CardDescription>{role}</CardDescription>
      </div>
    </CardHeader>
  </Card>
);

// Helper component for Step Cards
const StepCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="relative z-10 flex items-start gap-6">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-sm">
      {icon}
    </div>
    <div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
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
            <p className="text-sm text-muted-foreground mt-4">
              Gratis untuk bergabung. Tidak perlu kartu kredit.
            </p>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 bg-background">
          <div className="container">
            <p className="text-center text-muted-foreground mb-6">
              Dipercaya oleh para kreator dan brand terbaik
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
              <Image
                src="/logos/logo1.svg"
                alt="Partner Logo 1"
                className="h-8"
                width={128}
                height={32}
              />
              <Image
                src="/logos/logo2.svg"
                alt="Partner Logo 2"
                className="h-8"
                width={128}
                height={32}
              />
              <Image
                src="/logos/logo3.svg"
                alt="Partner Logo 3"
                className="h-8"
                width={128}
                height={32}
              />
              <Image
                src="/logos/logo4.svg"
                alt="Partner Logo 4"
                className="h-8"
                width={128}
                height={32}
              />
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

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 sm:py-24 px-4 bg-muted/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Bagaimana Cara Kerjanya?
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Proses yang sederhana dan transparan untuk semua pengguna.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <h3 className="text-2xl font-semibold text-center mb-8">
                  Untuk Kreator
                </h3>
                <div className="relative flex flex-col gap-8">
                  <div className="absolute left-1/2 -translate-x-1/2 top-12 bottom-12 w-px bg-border"></div>
                  <StepCard
                    icon={<PenSquare className="w-8 h-8 text-primary" />}
                    title="1. Buat Kampanye"
                    description="Tentukan tujuan, budget, dan target audiens Anda hanya dalam beberapa klik."
                  />
                  <StepCard
                    icon={<Share2 className="w-8 h-8 text-primary" />}
                    title="2. Undang Promotor"
                    description="Pilih dari ribuan promotor berkualitas atau biarkan mereka yang melamar."
                  />
                  <StepCard
                    icon={<BarChart className="w-8 h-8 text-primary" />}
                    title="3. Lacak Performa"
                    description="Pantau hasil kampanye secara real-time dan bayar hanya untuk hasil yang nyata."
                  />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-center mb-8">
                  Untuk Promotor
                </h3>
                <div className="relative flex flex-col gap-8">
                  <div className="absolute left-1/2 -translate-x-1/2 top-12 bottom-12 w-px bg-border"></div>
                  <StepCard
                    icon={<Briefcase className="w-8 h-8 text-primary" />}
                    title="1. Lamar Kampanye"
                    description="Temukan kampanye yang sesuai dengan niche dan audiens Anda."
                  />
                  <StepCard
                    icon={<CheckCircle className="w-8 h-8 text-primary" />}
                    title="2. Promosikan Konten"
                    description="Buat konten promosi yang otentik dan bagikan di platform sosial media Anda."
                  />
                  <StepCard
                    icon={<DollarSign className="w-8 h-8 text-primary" />}
                    title="3. Dapatkan Bayaran"
                    description="Terima pembayaran harian secara otomatis untuk setiap view yang terverifikasi."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-16 sm:py-24 px-4">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Apa Kata Mereka yang Telah Bergabung?
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Kisah sukses dari para kreator dan promoter di platform kami.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <TestimonialCard
                name="Rina Setiawati"
                role="Content Creator"
                avatar="/avatars/rina.png"
              >
                “Sejak menggunakan ContentBoost, jangkauan konten saya meningkat
                200%! Sistemnya transparan dan mudah digunakan. Sangat
                direkomendasikan untuk kreator yang ingin tumbuh.”
              </TestimonialCard>
              <TestimonialCard
                name="Budi Hartono"
                role="Promoter"
                avatar="/avatars/budi.png"
              >
                “Akhirnya ada platform yang adil bagi para promoter. Pembayaran
                harian membuat cash flow saya lancar. Saya bisa fokus membuat
                konten promosi berkualitas.”
              </TestimonialCard>
              <TestimonialCard
                name="Andi Wijaya"
                role="Content Creator"
                avatar="/avatars/andi.png"
              >
                “Fitur deteksi bot-nya luar biasa. Saya yakin bahwa budget
                promosi saya hanya digunakan untuk audiens yang nyata. Hasilnya,
                ROI kampanye saya jauh lebih tinggi.”
              </TestimonialCard>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 sm:py-24 px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Pertanyaan yang Sering Diajukan
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Tidak menemukan jawaban yang Anda cari? Hubungi tim support
                kami.
              </p>
            </div>
            <div className="space-y-4">
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Bagaimana cara kerja deteksi bot?</h3>
                <p className="text-muted-foreground">
                  Sistem kami menganalisis berbagai metrik seperti perilaku
                  menonton, sumber traffic, dan data teknis lainnya untuk
                  memberikan skor kepercayaan pada setiap view. Hanya view
                  dengan skor di atas ambang batas yang dianggap valid dan akan
                  dikenakan biaya.
                </p>
              </div>
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Kapan saya akan menerima pembayaran sebagai promotor?</h3>
                <p className="text-muted-foreground">
                  Pembayaran diproses secara otomatis setiap hari (24 jam) untuk
                  semua penghasilan yang terverifikasi dari hari sebelumnya.
                  Anda dapat melacak semua transaksi di dashboard Anda.
                </p>
              </div>
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Platform sosial media apa saja yang didukung?</h3>
                <p className="text-muted-foreground">
                  Saat ini kami mendukung integrasi penuh dengan TikTok dan
                  Instagram. Dukungan untuk YouTube Shorts dan platform lainnya
                  akan segera hadir.
                </p>
              </div>
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Apakah ada biaya tersembunyi?</h3>
                <p className="text-muted-foreground">
                  Tidak. Kami percaya pada transparansi. Kreator membayar sesuai
                  rate per view yang mereka tentukan, dan promotor menerima
                  bagiannya setelah dipotong biaya platform yang jelas. Semua
                  biaya akan terlihat di dashboard Anda.
                </p>
              </div>
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
