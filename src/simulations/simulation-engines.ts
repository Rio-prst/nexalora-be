import {
  IND_ARRIVAL_INTERVAL_SEC,
  IND_CUSTOMER_COUNT,
  IND_SCENARIO_CAPACITIES,
  IND_STAGE_DURATIONS_SEC,
  IND_SIMULATION_HORIZON_SEC,
  INF_MAX_EXECUTION_STEPS,
} from './simulation.constants.js';

export type InfBlockType =
  | 'START'
  | 'CHECK_STOCK'
  | 'CHECK_PAYMENT'
  | 'DECREMENT_STOCK'
  | 'ISSUE_TICKET'
  | 'REJECT_ORDER'
  | 'END';

export type InfNode = {
  id: string;
  type: InfBlockType;
  next?: string;
  yes?: string;
  no?: string;
};

export type InfGraph = { nodes: InfNode[] };

export type InfInput = {
  stock: number;
  quantity: number;
  paymentSuccess: boolean;
};

export type InfResult = {
  outcome: 'COMPLETED' | 'REJECTED' | 'CYCLE_DETECTED';
  finalStock: number;
  ticketsIssued: number;
  rejected: boolean;
  steps: number;
};

export type InfValidationError = { nodeId: string; message: string };

export const INF_ORDER_GRAPH: InfGraph = {
  nodes: [
    { id: 'start', type: 'START', next: 'check_stock' },
    {
      id: 'check_stock',
      type: 'CHECK_STOCK',
      yes: 'check_payment',
      no: 'reject',
    },
    {
      id: 'check_payment',
      type: 'CHECK_PAYMENT',
      yes: 'decrement',
      no: 'reject',
    },
    { id: 'decrement', type: 'DECREMENT_STOCK', next: 'issue' },
    { id: 'issue', type: 'ISSUE_TICKET', next: 'end' },
    { id: 'reject', type: 'REJECT_ORDER', next: 'end' },
    { id: 'end', type: 'END' },
  ],
};

const TERMINAL: ReadonlySet<InfBlockType> = new Set<InfBlockType>(['END']);
const BRANCHING: ReadonlySet<InfBlockType> = new Set<InfBlockType>([
  'CHECK_STOCK',
  'CHECK_PAYMENT',
]);

export function validateInfGraph(graph: InfGraph): InfValidationError[] {
  const errors: InfValidationError[] = [];
  const byId = new Map(graph.nodes.map((node) => [node.id, node] as const));

  if (!graph.nodes.some((node) => node.type === 'START')) {
    errors.push({ nodeId: '-', message: 'Graph has no START block' });
  }

  if (!graph.nodes.some((node) => node.type === 'END')) {
    errors.push({ nodeId: '-', message: 'Graph has no END block' });
  }

  for (const node of graph.nodes) {
    const targets = BRANCHING.has(node.type)
      ? [node.yes, node.no]
      : TERMINAL.has(node.type)
        ? []
        : [node.next];

    for (const target of targets) {
      if (target === undefined) {
        errors.push({ nodeId: node.id, message: 'Missing edge target' });
      } else if (!byId.has(target)) {
        errors.push({
          nodeId: node.id,
          message: `Edge points at unknown node: ${target}`,
        });
      }
    }
  }

  return errors;
}

export function runInfGraph(
  graph: InfGraph,
  input: InfInput,
  maxSteps: number = INF_MAX_EXECUTION_STEPS,
): InfResult {
  const byId = new Map(graph.nodes.map((node) => [node.id, node] as const));

  let current = graph.nodes.find((node) => node.type === 'START');
  let stock = input.stock;
  let ticketsIssued = 0;
  let rejected = false;
  let steps = 0;

  while (current !== undefined) {
    if (steps >= maxSteps) {
      return {
        outcome: 'CYCLE_DETECTED',
        finalStock: stock,
        ticketsIssued,
        rejected,
        steps,
      };
    }

    steps += 1;

    if (TERMINAL.has(current.type)) break;

    if (current.type === 'DECREMENT_STOCK') stock -= input.quantity;
    if (current.type === 'ISSUE_TICKET') ticketsIssued += 1;
    if (current.type === 'REJECT_ORDER') rejected = true;

    if (current.type === 'CHECK_STOCK') {
      current = byId.get(
        input.stock >= input.quantity
          ? (current.yes ?? '')
          : (current.no ?? ''),
      );
      continue;
    }

    if (current.type === 'CHECK_PAYMENT') {
      current = byId.get(
        input.paymentSuccess ? (current.yes ?? '') : (current.no ?? ''),
      );
      continue;
    }

    current = byId.get(current.next ?? '');
  }

  return {
    outcome: rejected ? 'REJECTED' : 'COMPLETED',
    finalStock: stock,
    ticketsIssued,
    rejected,
    steps,
  };
}

export type IndAllocation = readonly [number, number, number];

export type IndResult = {
  completedCustomerIds: string[];
  inProgressCustomerIds: string[];
  inQueueCustomerIds: string[];
  completionTimes: Record<string, number>;
  totalCustomers: number;
};

export function indCustomerId(index: number): string {
  return `C${String(index + 1).padStart(2, '0')}`;
}

export function indArrivalTime(index: number): number {
  return index * IND_ARRIVAL_INTERVAL_SEC;
}

export function indScenarioCapacity(scenarioId: string): number | null {
  if (scenarioId === 'scenario_1') return IND_SCENARIO_CAPACITIES.scenario_1;
  if (scenarioId === 'scenario_2') return IND_SCENARIO_CAPACITIES.scenario_2;
  return null;
}

export function isValidIndAllocation(
  allocation: IndAllocation,
  capacity: number,
): boolean {
  if (allocation.length !== 3) return false;
  if (allocation.some((count) => !Number.isInteger(count) || count < 0)) {
    return false;
  }
  return allocation.reduce((sum, count) => sum + count, 0) <= capacity;
}

export function runIndSimulation(
  allocation: IndAllocation,
  capacity: number,
  horizonSec: number = IND_SIMULATION_HORIZON_SEC,
): IndResult {
  const freeAt: number[][] = [
    Array.from({ length: allocation[0] ?? 0 }, () => 0),
    Array.from({ length: allocation[1] ?? 0 }, () => 0),
    Array.from({ length: allocation[2] ?? 0 }, () => 0),
  ];

  const finishedStage: Array<Array<number | null>> = [
    Array.from({ length: IND_CUSTOMER_COUNT }, () => null),
    Array.from({ length: IND_CUSTOMER_COUNT }, () => null),
    Array.from({ length: IND_CUSTOMER_COUNT }, () => null),
  ];

  for (let index = 0; index < IND_CUSTOMER_COUNT; index += 1) {
    let reachesAt = indArrivalTime(index);

    for (let stage = 0; stage < 3; stage += 1) {
      const pool = freeAt[stage] ?? [];
      const column = finishedStage[stage] ?? [];

      if (pool.length === 0) {
        column[index] = null;
        return emptyIndResult(index + 1, finishedStage, horizonSec);
      }

      let server = 0;
      for (let s = 1; s < pool.length; s += 1) {
        if ((pool[s] ?? 0) < (pool[server] ?? 0)) server = s;
      }

      const startsAt = Math.max(reachesAt, pool[server] ?? 0);
      const finishesAt = startsAt + (IND_STAGE_DURATIONS_SEC[stage] ?? 0);

      pool[server] = finishesAt;
      column[index] = finishesAt;
      reachesAt = finishesAt;
    }
  }

  return classify(finishedStage, horizonSec, IND_CUSTOMER_COUNT);
}

function classify(
  finishedStage: Array<Array<number | null>>,
  horizonSec: number,
  customerCount: number,
): IndResult {
  const completedCustomerIds: string[] = [];
  const inProgressCustomerIds: string[] = [];
  const inQueueCustomerIds: string[] = [];
  const completionTimes: Record<string, number> = {};

  for (let index = 0; index < customerCount; index += 1) {
    const id = indCustomerId(index);
    const deliveredAt = finishedStage[2]?.[index] ?? null;
    const preparedAt = finishedStage[1]?.[index] ?? null;

    if (deliveredAt !== null && deliveredAt <= horizonSec) {
      completedCustomerIds.push(id);
      completionTimes[id] = deliveredAt;
    } else if (preparedAt !== null && preparedAt <= horizonSec) {
      inProgressCustomerIds.push(id);
    } else {
      inQueueCustomerIds.push(id);
    }
  }

  return {
    completedCustomerIds,
    inProgressCustomerIds,
    inQueueCustomerIds,
    completionTimes,
    totalCustomers: customerCount,
  };
}

function emptyIndResult(
  reached: number,
  finishedStage: Array<Array<number | null>>,
  horizonSec: number,
): IndResult {
  return classify(finishedStage, horizonSec, reached);
}
