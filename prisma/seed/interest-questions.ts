import type { PrismaClient } from '../../src/generated/prisma/client.js';

export const INSTRUMENT_VERSION = 'v0.1';

const QUESTIONS = [
  {
    itemId: 'q1',
    dimension: 'LOGIC_SYSTEM',
    cluster: 'informatika',
    category: 'Logika & Sistem',
    position: 1,
    prompt:
      'Seberapa menarik bagimu menyusun langkah-langkah berurutan agar sebuah tugas berjalan otomatis?',
    subtext:
      'Misalnya menyusun aturan sortir berkas atau alur pendaftaran kegiatan.',
  },
  {
    itemId: 'q2',
    dimension: 'LOGIC_SYSTEM',
    cluster: 'informatika',
    category: 'Logika & Sistem',
    position: 2,
    prompt:
      'Seberapa menarik bagimu mencari penyebab sebuah program gagal berjalan?',
    subtext:
      'Misalnya menelusuri pesan galat sampai menemukan bagian yang salah.',
  },
  {
    itemId: 'q3',
    dimension: 'LOGIC_SYSTEM',
    cluster: 'informatika',
    category: 'Logika & Sistem',
    position: 3,
    prompt:
      'Seberapa menarik bagimu membuat aturan atau syarat yang harus dipenuhi sebuah sistem?',
    subtext:
      'Misalnya ketentuan kelayakan serta batas nilai yang mengecek.',
  },
  {
    itemId: 'q4',
    dimension: 'PROCESS_DATA',
    cluster: 'informatika',
    category: 'Data & Proses',
    position: 4,
    prompt:
      'Seberapa menarik bagimu mengumpulkan data lalu mencari pola di dalamnya?',
    subtext:
      'Misalnya merangkum hasil penjualan selama setahun untuk melihat bulan tersibuk.',
  },
  {
    itemId: 'q5',
    dimension: 'PROCESS_DATA',
    cluster: 'informatika',
    category: 'Data & Proses',
    position: 5,
    prompt:
      'Seberapa menarik bagimu memperbaiki agar suatu proses kerja berjalan lebih cepat atau lebih hemat?',
    subtext:
      'Misalnya mengurangi langkah yang tidak perlu pada satu alur kerja.',
  },
  {
    itemId: 'q6',
    dimension: 'PROCESS_DATA',
    cluster: 'informatika',
    category: 'Data & Proses',
    position: 6,
    prompt:
      'Seberapa menarik bagimu merancang bentuk tampilan agar data mudah dibaca orang lain?',
    subtext:
      'Misalnya menyusun tabel atau diagram supaya temuan langsung terlihat.',
  },
  {
    itemId: 'q7',
    dimension: 'VISUAL_COMM',
    cluster: 'dkv',
    category: 'Visual & Komunikasi',
    position: 7,
    prompt:
      'Seberapa menarik bagimu merancang tampilan visual agar suatu pesan mudah dipahami?',
    subtext:
      'Misalnya menyusun tata letak poster atau letak tombol pada aplikasi.',
  },
  {
    itemId: 'q8',
    dimension: 'VISUAL_COMM',
    cluster: 'dkv',
    category: 'Visual & Komunikasi',
    position: 8,
    prompt:
      'Seberapa menarik bagimu memilih warna, huruf, dan tata letak untuk sebuah media?',
    subtext:
      'Misalnya menentukan pasangan warna yang enak dibaca pada halaman web.',
  },
  {
    itemId: 'q9',
    dimension: 'VISUAL_COMM',
    cluster: 'dkv',
    category: 'Visual & Komunikasi',
    position: 9,
    prompt:
      'Seberapa menarik bagimu menyusun kata atau gambar agar informasi tersusun jelas?',
    subtext:
      'Misalnya membuat diagram yang menjelaskan bagian-bagian sebuah alat.',
  },
  {
    itemId: 'q10',
    dimension: 'EXPLORATION_COLLAB',
    cluster: 'lintas-jurusan',
    category: 'Eksplorasi & Kerja Sama',
    position: 10,
    prompt:
      'Seberapa menarik bagimu mencoba aktivitas baru di bidang yang belum pernah kamu pelajari?',
    subtext:
      'Misalnya mengerjakan studi kasus dari jurusan yang berbeda.',
  },
  {
    itemId: 'q11',
    dimension: 'EXPLORATION_COLLAB',
    cluster: 'lintas-jurusan',
    category: 'Eksplorasi & Kerja Sama',
    position: 11,
    prompt:
      'Seberapa menarik bagimu bekerja bersama orang yang punya latar belakang berbeda?',
    subtext:
      'Misalnya berdiskusi dalam kelompok yang anggotanya punya latar belakang berbeda.',
  },
  {
    itemId: 'q12',
    dimension: 'EXPLORATION_COLLAB',
    cluster: 'lintas-jurusan',
    category: 'Eksplorasi & Kerja Sama',
    position: 12,
    prompt:
      'Seberapa menarik bagimu menjelaskan hasil kerjaanmu agar orang lain bisa memakai?',
    subtext:
      'Misalnya menulis panduan singkat atau mempresentasikan hasil kerja kelompok.',
  },
];

export async function seedInterestQuestions(
  prisma: PrismaClient,
): Promise<void> {
  for (const question of QUESTIONS) {
    await prisma.interestQuestion.upsert({
      where: { itemId: question.itemId },
      create: { ...question, instrumentVersion: INSTRUMENT_VERSION },
      update: {
        dimension: question.dimension,
        cluster: question.cluster,
        category: question.category,
        prompt: question.prompt,
        subtext: question.subtext,
        position: question.position,
        instrumentVersion: INSTRUMENT_VERSION,
      },
    });
  }
}