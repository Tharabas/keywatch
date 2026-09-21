/**
 * Returns the last Element of an Array
 *
 * @param {Array} arr
 * @return {*}
 */
export function last(arr: any[]): any;
/**
 * Checks whether the Haystack Array contains a needle element
 * @param {Array} haystack
 * @param {*} needle
 * @return {boolean}
 */
export function contains(haystack: any[], needle: any): boolean;
/**
 * Checks whether a Haystack Array of Strings contains a needle string,
 * but ignores the case of the strings
 *
 * @param {string[]} haystack
 * @param {string} needle
 * @return {boolean}
 */
export function containsIgnoreCase(haystack: string[], needle: string): boolean;
/**
 * Checks if the provided argument is a string
 *
 * @param {*} s
 * @return {boolean}
 */
export function isString(s: any): boolean;
/**
 * Checks if the provided argument is an Object
 *
 * @param {*} obj
 * @return {boolean}
 */
export function isObject(obj: any): boolean;
