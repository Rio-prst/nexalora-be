import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PUBLICATION_STATUS } from './config.js';

const SKILLS = [
  {
    id: 'programming',
    name: 'Pemrograman',
    description: 'Menulis, membaca, dan memperbaiki kode program.',
  },
  {
    id: 'data-analysis',
    name: 'Analisis Data',
    description: 'Mengolah data terstruktur untuk ditarik kesimpulan.',
  },
  {
    id: 'system-design',
    name: 'Perancangan Sistem',
    description: 'Merancang arsitektur komponen dan alur data.',
  },
  {
    id: 'visual-design',
    name: 'Desain Visual',
    description: 'Menyusun Hierarchy, tipografi, dan komposisi pesan visual.',
  },
  {
    id: 'typography',
    name: 'Tipografi dan Layout',
    description: 'Mengatur ukuran teks, spasi, dan tata letak agar terbaca.',
  },
  {
    id: 'process-mapping',
    name: 'Pemetaan Proses',
    description: 'Menggambarkan alur kerja dan menemukan titik macet.',
  },
  {
    id: 'project-management',
    name: 'Manajemen Proyek',
    description: 'Menyusun jadwal, tenggat, dan pembagian kerja.',
  },
  {
    id: 'technical-communication',
    name: 'Komunikasi Teknis',
    description: 'Menjelaskan keputusan teknis kepada orang non-teknis.',
  },
];

const CAREERS = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    summary:
      'Membangun dan memelihara perangkat lunak yang dipakai banyak orang.',
    activitiesJson: [
      'Merancang fitur dari kebutuhan pengguna',
      'Menulis dan menguji kode',
      'Menelusuri penyebab kerusakan',
    ],
    sourceIdsJson: [],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    summary:
      'Mengubah data mentah menjadi gambaran yang bisa dipakai mengambil keputusan.',
    activitiesJson: [
      'Menyiapkan data',
      'Menganalisis pola',
      'Menyusun laporan singkat',
    ],
    sourceIdsJson: [],
  },
  {
    id: 'process-engineer',
    title: 'Process and Quality Engineer',
    summary: 'Memperbaiki cara kerja agar lebih cepat, aman, dan hemat biaya.',
    activitiesJson: [
      'Mengamati alur kerja',
      'Mengukur waktu dan penundaan',
      'Merancang perbaikan',
    ],
    sourceIdsJson: [],
  },
  {
    id: 'ui-designer',
    title: 'UI Designer',
    summary: 'Merancang tampilan antarmuka yang enak dibaca dan mudah dipakai.',
    activitiesJson: [
      'Menggambar wireframe',
      'Menyusun sistem visual',
      'Menguji keterbacaan',
    ],
    sourceIdsJson: [],
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    summary: 'Menentukan apa yang perlu dibuat dan mengapa.',
    activitiesJson: [
      'Wawancara pengguna',
      'Menyusun prioritas',
      'Mengkoordinasikan tim',
    ],
    sourceIdsJson: [],
  },
  {
    id: 'frontend-engineer',
    title: 'Frontend Engineer',
    summary:
      'Menerjemahkan desain menjadi antarmuka yang berjalan di peramban.',
    activitiesJson: [
      'Menyusun komponen',
      'Menerapkan sistem visual',
      'Menjaga performa halaman',
    ],
    sourceIdsJson: [],
  },
];

const CAREER_MAJORS = [
  {
    careerId: 'software-engineer',
    majorId: 'INF',
    mappingReason:
      'Kebanyakan aktivitas karier ini adalah membangun perangkat lunak.',
  },
  {
    careerId: 'software-engineer',
    majorId: 'IND',
    mappingReason:
      'Banyak sistem internal perusahaan adalah alat bantu proses kerja.',
  },
  {
    careerId: 'data-analyst',
    majorId: 'INF',
    mappingReason:
      'Analisis data umumnya butuh kemampuan pemrograman dan basis data.',
  },
  {
    careerId: 'data-analyst',
    majorId: 'IND',
    mappingReason: 'Optimasi proses sering bertumpu pada analisis data.',
  },
  {
    careerId: 'process-engineer',
    majorId: 'IND',
    mappingReason:
      'Peran ini berpusat pada perancangan dan perbaikan sistem kerja.',
  },
  {
    careerId: 'process-engineer',
    majorId: 'INF',
    mappingReason: 'Perbaikan proses kerap butuh otomatisasi.',
  },
  {
    careerId: 'ui-designer',
    majorId: 'DKV',
    mappingReason: 'Peran ini berpusat pada perancangan pesan visual.',
  },
  {
    careerId: 'product-manager',
    majorId: 'IND',
    mappingReason:
      'Manajemen produk melibatkan pemetaan proses dan prioritas kerja tim.',
  },
  {
    careerId: 'product-manager',
    majorId: 'DKV',
    mappingReason:
      'Produk digital menuntut pemahaman pesan visual dan pengalaman pengguna.',
  },
  {
    careerId: 'frontend-engineer',
    majorId: 'INF',
    mappingReason: 'Fokus pada logika dan struktur antarmuka di sisi peramban.',
  },
  {
    careerId: 'frontend-engineer',
    majorId: 'DKV',
    mappingReason:
      'Sisi visual antarmuka memerlukan teknik tipografi dan komposisi.',
  },
];

const CAREER_SKILLS = [
  { careerId: 'software-engineer', skillId: 'programming' },
  { careerId: 'software-engineer', skillId: 'system-design' },
  { careerId: 'software-engineer', skillId: 'project-management' },
  { careerId: 'software-engineer', skillId: 'technical-communication' },
  { careerId: 'data-analyst', skillId: 'data-analysis' },
  { careerId: 'data-analyst', skillId: 'programming' },
  { careerId: 'data-analyst', skillId: 'system-design' },
  { careerId: 'data-analyst', skillId: 'technical-communication' },
  { careerId: 'process-engineer', skillId: 'process-mapping' },
  { careerId: 'process-engineer', skillId: 'data-analysis' },
  { careerId: 'process-engineer', skillId: 'project-management' },
  { careerId: 'process-engineer', skillId: 'technical-communication' },
  { careerId: 'ui-designer', skillId: 'visual-design' },
  { careerId: 'ui-designer', skillId: 'typography' },
  { careerId: 'ui-designer', skillId: 'process-mapping' },
  { careerId: 'ui-designer', skillId: 'technical-communication' },
  { careerId: 'product-manager', skillId: 'project-management' },
  { careerId: 'product-manager', skillId: 'process-mapping' },
  { careerId: 'product-manager', skillId: 'technical-communication' },
  { careerId: 'product-manager', skillId: 'visual-design' },
  { careerId: 'frontend-engineer', skillId: 'programming' },
  { careerId: 'frontend-engineer', skillId: 'visual-design' },
  { careerId: 'frontend-engineer', skillId: 'system-design' },
  { careerId: 'frontend-engineer', skillId: 'typography' },
];

const REVIEWED_BY = 'Seed Placeholder (kurator belum ditetapkan)';

export async function seedCareers(prisma: PrismaClient): Promise<void> {
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      create: skill,
      update: { name: skill.name, description: skill.description },
    });
  }

  for (const career of CAREERS) {
    const payload = {
      ...career,
      reviewedBy: REVIEWED_BY,
      publicationStatus: PUBLICATION_STATUS,
    };

    await prisma.career.upsert({
      where: { id: career.id },
      create: payload,
      update: payload,
    });
  }

  for (const link of CAREER_MAJORS) {
    await prisma.careerMajor.upsert({
      where: {
        careerId_majorId: { careerId: link.careerId, majorId: link.majorId },
      },
      create: link,
      update: { mappingReason: link.mappingReason },
    });
  }

  for (const link of CAREER_SKILLS) {
    await prisma.careerSkill.upsert({
      where: {
        careerId_skillId: { careerId: link.careerId, skillId: link.skillId },
      },
      create: link,
      update: {},
    });
  }
}
