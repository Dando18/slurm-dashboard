/**
 * Utility functions
 */

/**
 * Executes a function and returns its result if no exception is thrown.
 * Otherwise, returns the specified fallback value.
 *
 * @template T The type of the function's return value.
 * @template U The type of the fallback value.
 * @param fn The function to execute.
 * @param elseVal The fallback value to return if an exception is thrown.
 * @returns The result of the function if no exception is thrown, otherwise the fallback value.
 */
export function returnIfNoThrowElse<T, U>(fn: () => T, elseVal: U): T | U {
    try {
        return fn();
    } catch (e) {
        return elseVal;
    }
}

/**
 * Executes the provided function and returns its result if no exception is thrown.
 * @param fn The function to execute.
 * @returns The result of the function if no exception is thrown, otherwise undefined.
 */
export function returnIfNoThrow<T>(fn: () => T): T | undefined {
    return returnIfNoThrowElse(fn, undefined);
}
