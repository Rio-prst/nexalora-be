import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { PUBLICATION_STATUS } from './config.js';

const INF_SCENARIOS = [
  {
    scenarioId: 'scenario_1',
    title: 'Pesanan Normal',
    brief: 'Stok 2, pesan 1, pembayaran berhasil.',
    initialState: { stock: 2, quantity: 1, paymentSuccess: true },
    expectedResult: { finalStock: 1, ticketsIssued: 1, rejected: false },
  },
  {
    scenarioId: 'scenario_2',
    title: 'Stok Habis',
    brief: 'Stok 0, pesan 1, pembayaran berhasil.',
    initialState: { stock: 0, quantity: 1, paymentSuccess: true },
    expectedResult: { finalStock: 0, ticketsIssued: 0, rejected: true },
  },
  {
    scenarioId: 'scenario_3',
    title: 'Pembayaran Gagal',
    brief: 'Stok 2, pesan 1, pembayaran gagal.',
    initialState: { stock: 2, quantity: 1, paymentSuccess: false },
    expectedResult: { finalStock: 2, ticketsIssued: 0, rejected: true },
  },
  {
    scenarioId: 'scenario_4',
    title: 'Alur Rusak',
    brief:
      'Graph harus ditolak validator atau dihentikan aman oleh batas langkah.',
    initialState: { stock: 2, quantity: 1, paymentSuccess: true },
    expectedResult: { outcome: 'VALIDATION_REJECTED_OR_CYCLE_DETECTED' },
  },
];

const IND_SCENARIOS = [
  {
    scenarioId: 'scenario_1',
    title: 'Empat Petugas',
    brief: 'Kapasitas 4 petugas pada seluruh tahap.',
    workerCapacity: 4,
  },
  {
    scenarioId: 'scenario_2',
    title: 'Petugas Berkurang',
    brief: 'Kapasitas 3 petugas pada seluruh tahap.',
    workerCapacity: 3,
  },
];

const DKV_SCENARIOS = [
  {
    scenarioId: 'scenario_1',
    title: 'Menu Sederhana',
    brief: 'Dua kategori dengan item dan harga lengkap.',
    maxItemsPerCategory: 4,
  },
  {
    scenarioId: 'scenario_2',
    title: 'Kategori Padat',
    brief: 'Banyak item per kategori untuk memeriksa pengelompokan.',
    maxItemsPerCategory: 3,
  },
];

const MISSIONS = [
  {
    id: 'inf-pesanan-tanpa-tabrakan',
    missionVersion: 'v1',
    engineVersion: 'inf-graph-runner-v1',
    majorId: 'INF',
    title: 'Pesanan Tanpa Tabrakan',
    configJson: {
      missionType: 'INF',
      brief:
        'Atur alur pemesanan kantin sekolah: cek pembayaran, cek stok, kurangi stok, lalu terbitkan tiket. Stok tidak boleh berkurang bila pembayaran gagal.',
      graph: {
        nodes: [
          { id: 'START', type: 'START', next: 'CHECK_PAYMENT' },
          {
            id: 'CHECK_PAYMENT',
            type: 'CHECK_PAYMENT',
            branches: { YES: 'CHECK_STOCK', NO: 'REJECT_ORDER' },
          },
          {
            id: 'CHECK_STOCK',
            type: 'CHECK_STOCK',
            branches: { YES: 'DECREMENT_STOCK', NO: 'REJECT_ORDER' },
          },
          {
            id: 'DECREMENT_STOCK',
            type: 'DECREMENT_STOCK',
            next: 'ISSUE_TICKET',
          },
          { id: 'ISSUE_TICKET', type: 'ISSUE_TICKET', next: 'END' },
          { id: 'REJECT_ORDER', type: 'REJECT_ORDER', next: 'END' },
          { id: 'END', type: 'END' },
        ],
      },
      maxExecutionSteps: 50,
      scenarios: INF_SCENARIOS,
    },
  },
  {
    id: 'ind-antrean-bergerak',
    missionVersion: 'v1',
    engineVersion: 'ind-des-runner-v1',
    majorId: 'IND',
    title: 'Antrean Bergerak',
    configJson: {
      missionType: 'IND',
      brief:
        'Atur alokasi petugas pada tiga tahap layanan berurutan agar antrean pelanggan bergerak tanpa menumpuk.',
      fixture: {
        customerCount: 12,
        arrivalIntervalSec: 30,
        firstArrivalSec: 0,
        dispatchPolicy: 'FCFS',
        horizonSec: 600,
        stages: [
          { id: 'S1', name: 'Terima Pesanan', durationSec: 20, order: 1 },
          { id: 'S2', name: 'Siapkan Makanan', durationSec: 60, order: 2 },
          { id: 'S3', name: 'Serahkan', durationSec: 10, order: 3 },
        ],
        eventOrder: ['COMPLETE', 'ADVANCE_QUEUE', 'ARRIVAL', 'DISPATCH'],
      },
      workerAllocationInvariant: {
        minPerStage: 0,
        sumMustNotExceed: 'scenario.workerCapacity',
      },
      goldenFixture: {
        reference: 'T07',
        scenarioId: 'scenario_1',
        workerAllocation: [2, 1, 1],
        expected: {
          horizonSec: 600,
          totalCustomers: 12,
          completedCount: 9,
          inQueueOrProgressCount: 3,
          firstCustomerDoneAtSec: 90,
          secondCustomerDoneAtSec: 150,
          completedPlusInFlight: 12,
        },
      },
      scenarios: IND_SCENARIOS,
    },
  },
  {
    id: 'dkv-menu-yang-terbaca',
    missionVersion: 'v1',
    engineVersion: 'dkv-checklist-v1',
    majorId: 'DKV',
    title: 'Menu yang Terbaca',
    configJson: {
      missionType: 'DKV',
      brief:
        'Susun tata letak menu kantin sekolah, lalu periksa kelengkapan dan keterbacaannya secara teknis.',
      scoringPolicy: {
        allowed: [
          'COMPLETENESS',
          'OVERFLOW',
          'FONT_SIZE',
          'CONTRAST_RATIO',
          'GROUPING',
        ],
        forbidden: ['AESTHETIC_SCORE', 'CREATIVITY_SCORE', 'TALENT_ASSESSMENT'],
      },
      checks: {
        requiredItemFields: ['name', 'price'],
        minFontSizePt: 12,
        minContrastRatio: 4.5,
        detectOverflow: true,
        groupingPerScenario: true,
      },
      paletteTokens: [
        { role: 'background', hex: '#FFFFFF' },
        { role: 'text', hex: '#1A1A1A' },
        { role: 'accent', hex: '#166534' },
        { role: 'mutedText', hex: '#6B7280' },
      ],
      menuLayout: {
        title: 'Menu Kantin Sekolah',
        categories: [
          {
            name: 'Makanan',
            items: [
              { name: 'Nasi Goreng', price: 12000, fontSizePt: 14 },
              { name: 'Mie Ayam Bakso', price: 12000, fontSizePt: 14 },
            ],
          },
          {
            name: 'Minuman',
            items: [{ name: 'Es Teh Manis', price: 4000, fontSizePt: 14 }],
          },
        ],
      },
      scenarios: DKV_SCENARIOS,
    },
  },
];

const REVIEWER = 'Seed Placeholder (kurator belum ditetapkan)';

export async function seedMissions(prisma: PrismaClient): Promise<void> {
  for (const mission of MISSIONS) {
    const payload = {
      ...mission,
      reviewerName: REVIEWER,
      publicationStatus: PUBLICATION_STATUS,
    };

    await prisma.mission.upsert({
      where: { id: mission.id },
      create: payload,
      update: {
        missionVersion: mission.missionVersion,
        engineVersion: mission.engineVersion,
        majorId: mission.majorId,
        title: mission.title,
        configJson: mission.configJson,
        reviewerName: REVIEWER,
        publicationStatus: PUBLICATION_STATUS,
      },
    });
  }
}
