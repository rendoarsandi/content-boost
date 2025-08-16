# Creator Promotion Platform

Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis menggunakan arsitektur monorepo Turborepo.

## ✨ Fitur Utama

Platform ini menyediakan fungsionalitas yang kaya untuk setiap peran dalam ekosistem promosi konten.

#### Untuk Kreator

- **Manajemen Kampanye:** Buat dan kelola kampanye promosi dengan mudah.
- **Dasbor Analitik:** Dapatkan wawasan mendalam tentang jangkauan, penayangan, dan ROI kampanye.
- **Penemuan Promotor:** Cari, filter, dan undang promotor yang paling sesuai dengan niche Anda.

#### Untuk Promotor

- **Profil Publik & Portofolio:** Bangun reputasi Anda dengan profil yang dapat disesuaikan yang menampilkan keahlian dan riwayat kerja Anda.
- **Sistem Tingkatan (Tier):** Naikkan peringkat melalui tingkatan kinerja (Bronze, Silver, Gold) untuk mendapatkan lebih banyak peluang.
- **Manajemen Kampanye:** Lamar kampanye dan lacak penghasilan Anda dengan mudah.

#### Untuk Admin

- **Pusat Resolusi Sengketa:** Mediasi dan selesaikan sengketa antara kreator dan promotor melalui antarmuka khusus.

## 🔮 Peta Jalan Masa Depan

- **Integrasi Platform Baru:** Dukungan untuk YouTube Shorts, X (Twitter), dan lainnya.
- **Komunikasi Langsung:** Fitur obrolan aman di dalam platform.
- **Filter Lanjutan:** Pencarian promotor yang lebih detail (demografi audiens, dll.).
- **Gamifikasi:** Lencana, papan peringkat, dan insentif lainnya.

## 🏗️ Arsitektur

### Monorepo Structure

```
creator-promotion-platform/
├── apps/                    # Next.js Applications
│   ├── landing-page/        # www.domain.com
│   ├── auth-app/           # auth.domain.com
│   ├── dashboard-app/      # dashboard.domain.com
│   └── admin-app/          # admin.domain.com
├── packages/               # Shared Packages
│   ├── ui/                 # ShadcnUI Components
│   ├── database/           # Skema tiruan (mock schemas)
│   └── ...
└── ...
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development servers
npm run dev
```

## 📜 Available Scripts

- `npm run dev` - Start all development servers.
- `npm run build` - Build all applications and packages.
- `npm run test` - Run all tests.
- `npm run lint` - Lint all code.
- `npm run format` - Format code with Prettier.
- `npm run migrate` - Run database migrations (jika berlaku).
- `npm run clean` - Clean all build artifacts.
- `npm run type-check` - Run TypeScript type checking.

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Database**: PostgreSQL (dikelola di **Supabase**), dengan skema tiruan di dalam kode.
- **Monorepo**: Turborepo
- **UI**: ShadcnUI + Tailwind CSS
- **Testing**: Jest + Playwright

## 📚 Documentation

- [GEMINI.md](GEMINI.md) - Konteks produk, arsitektur, dan peta jalan proyek.
- [Development Timeout Guide](docs/development-timeout-guide.md)
- [API Documentation](docs/api/)

## 🤝 Contributing

1. Ikuti struktur direktori yang sudah ada.
2. Tulis tes untuk fungsionalitas baru.
3. Perbarui dokumentasi jika diperlukan.

## 📄 License

Private - Creator Promotion Platform
