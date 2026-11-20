import { describe, it, expect } from 'vitest';
import { prisma } from '../client';

describe('Database client', () => {
  it('exports an instantiated prisma client', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
  });
});
