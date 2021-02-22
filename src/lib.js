/**
 * Returns the last Element of an Array
 *
 * @param {Array} arr
 * @return {*}
 */
export function last (arr) {
  return arr.slice(-1)[0]
}

/**
 * Checks whether the Haystack Array contains a needle element
 * @param {Array} haystack
 * @param {*} needle
 * @return {boolean}
 */
export function contains (haystack, needle) {
  return haystack.indexOf(needle) !== -1
}

/**
 * Checks whether a Haystack Array of Strings contains a needle string,
 * but ignores the case of the strings
 *
 * @param {string[]} haystack
 * @param {string} needle
 * @return {boolean}
 */
export function containsIgnoreCase (haystack, needle) {
  return haystack.map(x => x.toUpperCase()).indexOf(needle.toUpperCase()) !== -1
}

/**
 * Checks if the provided argument is a string
 *
 * @param {*} s
 * @return {boolean}
 */
export function isString (s) {
  return typeof s === 'string'
}

/**
 * Checks if the provided argument is an Object
 *
 * @param {*} obj
 * @return {boolean}
 */
export function isObject (obj) {
  return !Array.isArray(obj) && Object.prototype.isPrototypeOf(obj)
}
