import { describe, it, expect } from 'vitest';
import { utilityFunction } from '../utils';

describe('Utility Functions', () => {
    it('should return the correct value', () => {
        expect(utilityFunction()).toBe(expectedValue);
    });
});