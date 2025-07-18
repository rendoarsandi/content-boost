import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@repo/ui';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-600">ContentBoost</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="https://auth.domain.com" className="text-gray-600 hover:text-gray-900">
                Masuk
              </Link>
              <Button asChild>
                <Link href="https://auth.domain.com">Daftar Sekarang</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-indigo-100 text-indigo-800">Platform Promosi Terdepan</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Tingkatkan Engagement Konten Anda dengan{' '}
            <span className="text-indigo-600">Sistem Pay-Per-View</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Platform promosi konten kreator yang memungkinkan Anda memberikan fee kepada promoter 
            berdasarkan views legitimate dengan deteksi bot otomatis dan sistem pembayaran harian.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="https://auth.domain.com">Mulai Sebagai Creator</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="https://auth.domain.com">Bergabung Sebagai Promoter</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features for Creators */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Untuk Content Creators</h2>
            <p className="text-lg text-gray-600">Tingkatkan reach dan engagement konten Anda dengan mudah</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  Campaign Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Buat campaign promosi dengan budget dan rate per view yang dapat Anda tentukan sendiri. 
                  Upload materi promosi dan tentukan persyaratan khusus.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">🤖</span>
                  Bot Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Sistem deteksi bot otomatis dengan algoritma canggih memastikan Anda hanya membayar 
                  untuk views yang legitimate dan berkualitas.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  Real-time Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor performa campaign secara real-time dengan analytics mendalam dari 
                  TikTok dan Instagram melalui OAuth integration.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features for Promoters */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Untuk Promoters</h2>
            <p className="text-lg text-gray-600">Hasilkan income dengan mempromosikan konten berkualitas</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">✏️</span>
                  Content Editing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Akses materi promosi dari creator dan edit sesuai gaya konten Anda. 
                  Bukan hanya copy-paste, tapi kreativitas yang sesungguhnya.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">💰</span>
                  Daily Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Terima pembayaran harian otomatis berdasarkan views legitimate. 
                  Sistem pembayaran yang transparan dan dapat diandalkan.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-3">🔗</span>
                  Social Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Hubungkan akun TikTok dan Instagram Anda melalui OAuth untuk 
                  tracking otomatis dan transparansi penuh.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Pricing yang Transparan</h2>
            <p className="text-lg text-gray-600">Hanya bayar untuk hasil yang nyata</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-center">Untuk Creators</CardTitle>
                <CardDescription className="text-center">Buat campaign dan bayar per view</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">Rp 0</span>
                  <span className="text-gray-600">/bulan</span>
                </div>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Campaign management unlimited
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Bot detection otomatis
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Real-time analytics
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Bayar hanya untuk views legitimate
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="text-center">Untuk Promoters</CardTitle>
                <CardDescription className="text-center">Hasilkan income dari promosi</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-green-600">5%</span>
                  <span className="text-gray-600"> platform fee</span>
                </div>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Pembayaran harian otomatis
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Akses ke semua campaign
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Tools editing konten
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Tracking performa real-time
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Pertanyaan yang sering diajukan</p>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bagaimana sistem deteksi bot bekerja?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Sistem kami menganalisis rasio views:likes:comments, mendeteksi spike yang tidak wajar, 
                  dan menggunakan algoritma machine learning untuk memberikan confidence score. 
                  Views dengan bot confidence &gt;90% otomatis ditolak dari perhitungan pembayaran.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Kapan pembayaran diproses?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Pembayaran diproses setiap hari pada pukul 00:00 WIB. Sistem akan menghitung 
                  total views legitimate dalam 24 jam terakhir dan memproses pembayaran otomatis 
                  dengan retry mechanism jika terjadi kegagalan.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Platform social media apa saja yang didukung?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Saat ini kami mendukung TikTok dan Instagram melalui OAuth integration. 
                  Anda perlu menghubungkan akun social media untuk tracking otomatis 
                  dan transparansi data views, likes, dan comments.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Berapa minimum budget untuk membuat campaign?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Tidak ada minimum budget yang ditetapkan. Anda dapat mengatur budget 
                  dan rate per view sesuai kebutuhan. Sistem akan otomatis menghentikan 
                  campaign ketika budget habis atau mencapai target yang ditentukan.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bagaimana cara menjadi promoter?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Daftar akun, hubungkan social media Anda melalui OAuth, lalu browse 
                  campaign yang tersedia. Submit aplikasi dengan contoh konten, 
                  dan tunggu approval dari creator. Setelah disetujui, Anda bisa mulai promosi.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Siap Meningkatkan Engagement Konten Anda?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Bergabunglah dengan ribuan creator dan promoter yang sudah merasakan manfaatnya
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="https://auth.domain.com">Mulai Sekarang</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-indigo-600" asChild>
              <Link href="#features">Pelajari Lebih Lanjut</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">ContentBoost</h3>
              <p className="text-gray-400">
                Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#about" className="hover:text-white">About</Link></li>
                <li><Link href="#contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="#privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="#docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="#status" className="hover:text-white">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ContentBoost. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}