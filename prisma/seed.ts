import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function nowISO() {
  return new Date().toISOString();
}

async function main() {
  const n = await prisma.toko.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const toko1 = await prisma.toko.create({
    data: {
      nama: "Warung Bu Siti",
      deskripsi: "Kuliner rumahan khas Minang: rendang, keripik, dan sambal.",
      pemilik: "Siti Aminah",
      tarifOngkir: 12000,
      createdAt: nowISO(),
    },
  });
  const toko2 = await prisma.toko.create({
    data: {
      nama: "Kriya Kayu Jepara",
      deskripsi: "Kerajinan ukir kayu jati asli Jepara.",
      pemilik: "Budi Santoso",
      tarifOngkir: 25000,
      createdAt: nowISO(),
    },
  });
  const toko3 = await prisma.toko.create({
    data: {
      nama: "Batik Larasati",
      deskripsi: "Batik tulis dan cap khas Solo untuk pria & wanita.",
      pemilik: "Rina Wulandari",
      tarifOngkir: 15000,
      createdAt: nowISO(),
    },
  });

  const produkData = [
    { tokoId: toko1.id, nama: "Keripik Singkong Balado 250g", harga: 15000, stok: 50, kategori: "Makanan" },
    { tokoId: toko1.id, nama: "Rendang Sapi 500g", harga: 85000, stok: 20, kategori: "Makanan" },
    { tokoId: toko1.id, nama: "Sambal Terasi 200g", harga: 25000, stok: 30, kategori: "Makanan" },
    { tokoId: toko2.id, nama: "Meja Kopi Jati Ukir", harga: 450000, stok: 5, kategori: "Kerajinan" },
    { tokoId: toko2.id, nama: "Patung Kayu Ukir Garuda", harga: 180000, stok: 8, kategori: "Kerajinan" },
    { tokoId: toko2.id, nama: "Kotak Tisu Ukiran Jati", harga: 75000, stok: 15, kategori: "Kerajinan" },
    { tokoId: toko3.id, nama: "Kemeja Batik Pria Lengan Panjang", harga: 220000, stok: 12, kategori: "Fashion" },
    { tokoId: toko3.id, nama: "Kain Batik Tulis 2 Meter", harga: 350000, stok: 6, kategori: "Fashion" },
    { tokoId: toko3.id, nama: "Tas Selempang Batik", harga: 140000, stok: 10, kategori: "Fashion" },
  ];
  for (const p of produkData) {
    await prisma.produk.create({ data: { ...p, createdAt: nowISO() } });
  }

  await prisma.pembeli.create({
    data: { nama: "Andi Pratama", email: "andi@example.com", createdAt: nowISO() },
  });

  await prisma.config.create({
    data: { key: "komisi_persen", value: "5" },
  });

  console.log("seed selesai: 3 toko, 9 produk, 1 pembeli, komisi 5%");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
