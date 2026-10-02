export const rupiah = (n: number) =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

const pad = (n: number) => String(n).padStart(2, "0");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const nowISO = () => new Date().toISOString();

export const STATUS_SUBORDER: Record<string, string> = {
  menunggu_bayar: "Menunggu Bayar",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const STATUS_ORDER: Record<string, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
};
