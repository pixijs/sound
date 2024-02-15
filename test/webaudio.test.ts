import { filters } from '../src';
import { suite } from './suite';

suite(false);

describe(`filters.DistortionFilter`, () =>
{
    it('should create a DistortionFilter', () =>
    {
        const filter = new filters.DistortionFilter(0.5);

        expect(filter.amount).toBe(0.5);
    });
});
