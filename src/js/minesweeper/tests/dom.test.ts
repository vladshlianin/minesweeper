import { getById } from '../dom';

import { expect, it, describe, beforeEach } from 'vitest';

describe('Get by ID Dom', () => {
  beforeEach(() => {
    // Clear any existing DOM elements
    document.body.innerHTML = '';
  });

  it('should throw an error for non existing element', () => {
    expect(() => getById('non-existing')).toThrowError('Element with id non-existing was not found');
  });

  it('should throw an error if empty string provided', () => {
    expect(() => getById('')).toThrowError('Element id was not provided');
  });

  it('Should extract existing element', () => {
    const node = document.createElement('div');
    node.id = 'my-id';
    document.body.appendChild(node);
    expect(getById('my-id')).toBe(node);
  });

  it('returns element with correct type if specified', () => {
    const input = document.createElement('input');
    input.id = 'my-input';
    document.body.appendChild(input);

    const result = getById<HTMLInputElement>('my-input');
    expect(result).toBeInstanceOf(HTMLInputElement);
    expect(result).toBe(input);
  });
});
