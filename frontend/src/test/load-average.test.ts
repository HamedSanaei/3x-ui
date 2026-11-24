import { describe, expect, it } from 'vitest';

import { Status } from '@/models/status';
import { StatusSchema } from '@/schemas/status';
import { loadAppearance } from '@/pages/index/load-average';

describe('load capacity warnings', () => {
  it.each([1, 2, 4, 8, 16])('scales load to %i logical CPUs', (cpus) => {
    expect(loadAppearance(cpus / 4, cpus)).toMatchObject({ ratio: 0.25, severity: 'healthy' });
    expect(loadAppearance(cpus, cpus)).toMatchObject({
      ratio: 1,
      severity: 'nearCapacity',
      color: 'var(--ant-color-warning-active)',
    });
    expect(loadAppearance(cpus + 0.01, cpus).severity).toBe('aboveCapacity');
  });

  it.each([
    [0, 'var(--ant-color-success)'],
    [2, 'var(--ant-color-success)'],
    [2.4, 'color-mix(in srgb, var(--ant-color-warning) 50.000%, var(--ant-color-success))'],
    [2.8, 'color-mix(in srgb, var(--ant-color-warning-active) 0.000%, var(--ant-color-warning))'],
    [3.1, 'color-mix(in srgb, var(--ant-color-warning-active) 50.000%, var(--ant-color-warning))'],
    [3.6, 'var(--ant-color-warning-active)'],
    [4, 'var(--ant-color-warning-active)'],
    [4.01, 'var(--ant-color-error)'],
  ])('colors raw load %s on four CPUs as %s', (load, color) => {
    expect(loadAppearance(load, 4).color).toBe(color);
  });

  it('progresses through every severity without returning to a lower warning', () => {
    expect(
      [0, 2, 2.01, 2.8, 3.4, 4, 4.000001, Number.MAX_VALUE].map(
        (load) => loadAppearance(load, 4).severity,
      ),
    ).toEqual([
      'healthy',
      'healthy',
      'increasing',
      'elevated',
      'nearCapacity',
      'nearCapacity',
      'aboveCapacity',
      'aboveCapacity',
    ]);
  });

  it.each([undefined, null, -1, NaN, Infinity])(
    'never treats invalid load %s as healthy zero',
    (load) => {
      expect(loadAppearance(load, 4)).toEqual({
        value: null,
        ratio: null,
        severity: 'unavailable',
        color: null,
      });
    },
  );

  it.each([undefined, null, 0, -1, NaN, Infinity])(
    'preserves raw load but does not divide by invalid capacity %s',
    (cpus) => {
      expect(loadAppearance(1.2, cpus)).toEqual({
        value: 1.2,
        ratio: null,
        severity: 'unavailable',
        color: null,
      });
    },
  );

  it('keeps incomparable load neutral even with a positive CPU count', () => {
    expect(loadAppearance(20, 2, false)).toEqual({
      value: 20,
      ratio: null,
      severity: 'unavailable',
      color: null,
    });
  });
});

describe('status load measurements', () => {
  it('does not display healthy zero before the first status arrives', () => {
    expect(new Status().loads).toEqual([]);
  });
  it.each([undefined, null, []])(
    'preserves missing loads %s as unavailable through schema and model',
    (loads) => {
      const status = new Status(StatusSchema.parse({ loads, logicalPro: 4 }));
      expect(status.loads).toEqual([]);
    },
  );

  it('distinguishes measured zero and preserves above-capacity precision until presentation', () => {
    const status = new Status(StatusSchema.parse({ loads: [0, 4, 4.0004], logicalPro: 4 }));
    expect(status.loads).toEqual([0, 4, 4.0004]);
    expect(loadAppearance(status.loads[0], status.logicalPro).severity).toBe('healthy');
    expect(loadAppearance(status.loads[1], status.logicalPro).severity).toBe('nearCapacity');
    expect(loadAppearance(status.loads[2], status.logicalPro).severity).toBe('aboveCapacity');
  });
});
