import { suite } from './suite';
import { filters } from '../src';

suite(false);

describe(`filters.DistortionFilter`, () =>
{
    it('should create a DistortionFilter', () =>
    {
        const filter = new filters.DistortionFilter(0.5);

        expect(filter.amount).toBe(0.5);
    });
});