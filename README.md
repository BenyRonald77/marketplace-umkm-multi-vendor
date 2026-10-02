# Marketplace UMKM Multi-Vendor

Satu keranjang dari banyak toko UMKM. Checkout otomatis dipecah menjadi sub-order
per vendor — tiap sub-order punya ongkir dan status sendiri. Pembeli membayar satu
tagihan; dana dibagi ke saldo tiap vendor setelah dipotong komisi platform.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Buka http://localhost:3000.

## Halaman

| Halaman     | Fungsi                                                        |
|-------------|---------------------------------------------------------------|
| `/`         | Beranda + navigasi                                            |
| `/katalog`  | Katalog produk multi-toko (filter toko/kategori/cari, + keranjang) |
| `/keranjang`| Keranjang lintas toko                                         |
| `/checkout` | Pratinjau pecahan sub-order per vendor + ongkir, lalu checkout|
| `/pesanan`  | Pesanan pembeli: tagihan, bayar, batal per sub-order, lacak status |
| `/vendor`   | Dashboard vendor: pesanan masuk, saldo, mutasi, ubah status   |
| `/admin`    | Ledger komisi platform, ringkasan, ubah % komisi               |

## API utama

- `GET/POST /api/toko`, `GET/PATCH /api/toko/[id]`
- `GET/POST /api/produk`, `GET/PATCH /api/produk/[id]`
- `GET/POST/PUT/DELETE /api/keranjang`
- `GET /api/checkout/preview?pembeliId=` · `POST /api/checkout`
- `GET /api/pesanan?pembeliId=`
- `POST /api/pembayaran`
- `PATCH /api/suborder/[id]` · `POST /api/suborder/[id]/batal`
- `GET /api/vendor/[id]/dashboard`
- `GET /api/admin/ledger` · `GET /api/admin/ringkasan`
- `GET/PATCH /api/config`

## Aturan bisnis penting

- Checkout: stok dikurangi atomik via `updateMany` kondisional per produk; stok
  kurang → 409, tidak ada sub-order tercipta.
- Komisi = `(subtotal item + ongkir) × %` per sub-order, masuk ledger platform;
  sisanya masuk saldo vendor.
- Batal satu sub-order: stok kembali, ledger dikoreksi bila sudah dibayar,
  sub-order lain tidak terganggu.
