/**
 * Utility functions
 */

export function returnIfNoThrowElse<T, U>(fn: () => T, elseVal: U): T | U {
    try {
        return fn();
    } catch (e) {
        return elseVal;
    }
}

export function returnIfNoThrow<T>(fn: () => T): T | undefined {
    return returnIfNoThrowElse(fn, undefined);
}
