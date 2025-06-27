/**
 * Asserts that a node is not null or undefined and throws an error if it is.
 * Arrow functions are not recognized by TS Control Flow Analysis.
 *
 * @param node - The node to assert as non-null
 * @param id - The ID of the element for error messaging
 * @throws Throws an error if the node is null or undefined
 * @returns Type assertion that node is non-nullable
 *
 * @see {@link https://github.com/microsoft/TypeScript/pull/33622} TypeScript Control Flow Analysis reference
 */
function assert<T>(node: T, id: string): asserts node is NonNullable<T> {
  if (!node) throw new Error(`Element with id ${id} was not found`);
}

/**
 * Retrieves a DOM element by its ID and asserts that it exists.
 *
 * @param id - The ID of the element to retrieve
 * @throws Throws an error if no ID is provided or if the element is not found
 * @returns The DOM element cast to the specified type
 */
export const getById = <T = HTMLElement>(id: string): T => {
  if (!id.length) throw new Error('Element id was not provided');
  const node = document.getElementById(id) as T | null;
  assert(node, id);
  return node;
};
