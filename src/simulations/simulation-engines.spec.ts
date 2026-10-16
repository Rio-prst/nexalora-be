import { describe, expect, it } from '@jest/globals';
import {
  INF_ORDER_GRAPH,
  indScenarioCapacity,
  isValidIndAllocation,
  runIndSimulation,
  runInfGraph,
  validateInfGraph,
  type InfGraph,
} from './simulation-engines.js';
import {
  IND_SCENARIO_CAPACITIES,
  INF_MAX_EXECUTION_STEPS,
} from './simulation.constants.js';

describe('INF mission (R4)', () => {
  it('accepts the reference order graph', () => {
    expect(validateInfGraph(INF_ORDER_GRAPH)).toEqual([]);
  });

  it('INF-01 issues one ticket and leaves the remainder in stock', () => {
    const result = runInfGraph(INF_ORDER_GRAPH, {
      stock: 2,
      quantity: 1,
      paymentSuccess: true,
    });

    expect(result.finalStock).toBe(1);
    expect(result.ticketsIssued).toBe(1);
    expect(result.rejected).toBe(false);
  });

  it('INF-02 rejects when stock is short and never decrements', () => {
    const result = runInfGraph(INF_ORDER_GRAPH, {
      stock: 0,
      quantity: 1,
      paymentSuccess: true,
    });

    expect(result.finalStock).toBe(0);
    expect(result.ticketsIssued).toBe(0);
    expect(result.rejected).toBe(true);
  });

  it('INF-03 never reduces stock when payment fails', () => {
    const result = runInfGraph(INF_ORDER_GRAPH, {
      stock: 2,
      quantity: 1,
      paymentSuccess: false,
    });

    expect(result.finalStock).toBe(2);
    expect(result.ticketsIssued).toBe(0);
    expect(result.rejected).toBe(true);
  });

  it('INF-04 stops a cyclic graph inside the step budget (AC-04A2)', () => {
    const cyclic: InfGraph = {
      nodes: [
        { id: 'start', type: 'START', next: 'loop' },
        { id: 'loop', type: 'ISSUE_TICKET', next: 'loop' },
        { id: 'end', type: 'END' },
      ],
    };

    const result = runInfGraph(cyclic, {
      stock: 5,
      quantity: 1,
      paymentSuccess: true,
    });

    expect(result.outcome).toBe('CYCLE_DETECTED');
    expect(result.steps).toBeLessThanOrEqual(INF_MAX_EXECUTION_STEPS);
  });

  it('rejects a graph without a START block', () => {
    const errors = validateInfGraph({
      nodes: [{ id: 'end', type: 'END' }],
    });

    expect(errors.some((error) => error.message.includes('START'))).toBe(true);
  });

  it('rejects a dangling branch', () => {
    const errors = validateInfGraph({
      nodes: [
        { id: 'start', type: 'START', next: 'check' },
        { id: 'check', type: 'CHECK_STOCK', yes: 'nowhere' },
        { id: 'end', type: 'END' },
      ],
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('IND mission (R5)', () => {
  it('T07 completes exactly nine customers within the horizon', () => {
    const result = runIndSimulation(
      [2, 1, 1],
      IND_SCENARIO_CAPACITIES.scenario_1,
    );

    expect(result.completedCustomerIds).toHaveLength(9);
  });

  it('T07 finishes C1 at 90s and C2 at 150s', () => {
    const result = runIndSimulation(
      [2, 1, 1],
      IND_SCENARIO_CAPACITIES.scenario_1,
    );

    expect(result.completionTimes['C01']).toBe(90);
    expect(result.completionTimes['C02']).toBe(150);
  });

  it('accounts for all twelve customers', () => {
    const result = runIndSimulation(
      [2, 1, 1],
      IND_SCENARIO_CAPACITIES.scenario_1,
    );

    const counted =
      result.completedCustomerIds.length +
      result.inProgressCustomerIds.length +
      result.inQueueCustomerIds.length;

    expect(counted).toBe(12);
    expect(result.totalCustomers).toBe(12);
  });

  it('rejects an allocation larger than the scenario capacity (AC-04B1)', () => {
    expect(isValidIndAllocation([3, 2, 1], 4)).toBe(false);
    expect(isValidIndAllocation([2, 1, 1], 4)).toBe(true);
    expect(isValidIndAllocation([2, 1, 1], 3)).toBe(false);
  });

  it('rejects a negative allocation', () => {
    expect(isValidIndAllocation([-1, 2, 1], 4)).toBe(false);
  });

  it('reads the capacity of both scenarios', () => {
    expect(indScenarioCapacity('scenario_1')).toBe(4);
    expect(indScenarioCapacity('scenario_2')).toBe(3);
    expect(indScenarioCapacity('scenario_9')).toBeNull();
  });

  it('produces identical output for identical input', () => {
    const first = runIndSimulation([2, 1, 1], 4);
    const second = runIndSimulation([2, 1, 1], 4);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
