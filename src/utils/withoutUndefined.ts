/**
 * Copy of the options without the keys set to `undefined`, so spreading
 * them over the defaults doesn't replace a default with `undefined`.
 * @ignore
 */
export function withoutUndefined<T extends object>(options?: T): Partial<T>
{
    const result: Partial<T> = {};

    for (const key of Object.keys(options || {}) as (keyof T)[])
    {
        if (options[key] !== undefined)
        {
            result[key] = options[key];
        }
    }

    return result;
}
