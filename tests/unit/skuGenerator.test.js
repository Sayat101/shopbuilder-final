const { generateSKU, generateVariantMatrix } = require('../../src/utils/skuGenerator');

describe('SKU Generator', () => {
  describe('generateSKU', () => {
    test('generates SKU from title only', () => {
      expect(generateSKU('Sweater')).toBe('SWEATER');
    });

    test('generates SKU with color', () => {
      expect(generateSKU('Sweater', { color: 'Red' })).toBe('SWEATER-RED');
    });

    test('generates SKU with all attributes', () => {
      expect(generateSKU('Sweater', { color: 'Red', size: 'L', material: 'Cotton' }))
        .toBe('SWEATER-RED-L-COTTON');
    });

    test('uppercases all parts', () => {
      expect(generateSKU('t-shirt', { color: 'blue', size: 'xl' }))
        .toBe('TSHIRT-BLUE-XL');
    });

    test('removes spaces from attributes', () => {
      expect(generateSKU('Jacket', { color: 'Dark Blue' }))
        .toBe('JACKET-DARKBLUE');
    });

    test('truncates long titles to 10 chars', () => {
      const sku = generateSKU('VeryLongProductTitle', { color: 'Red' });
      expect(sku.split('-')[0].length).toBeLessThanOrEqual(10);
    });
  });

  describe('generateVariantMatrix', () => {
    test('generates all combinations', () => {
      const variants = generateVariantMatrix('Sweater', {
        colors: ['Red', 'Blue'],
        sizes: ['S', 'M'],
      });
      expect(variants).toHaveLength(4); // 2 colors × 2 sizes
    });

    test('correct SKUs in matrix', () => {
      const variants = generateVariantMatrix('Sweater', {
        colors: ['Red'],
        sizes: ['L'],
        materials: ['Cotton'],
      });
      expect(variants[0].sku).toBe('SWEATER-RED-L-COTTON');
      expect(variants[0].option1Value).toBe('Red');
      expect(variants[0].option2Value).toBe('L');
      expect(variants[0].option3Value).toBe('Cotton');
    });

    test('generates single variant when no options', () => {
      const variants = generateVariantMatrix('Plain Shirt', {});
      expect(variants).toHaveLength(1);
      expect(variants[0].sku).toBe('PLAINSHIRT');
    });

    test('3D matrix: 2 colors × 3 sizes × 2 materials = 12 variants', () => {
      const variants = generateVariantMatrix('Jacket', {
        colors: ['Black', 'White'],
        sizes: ['S', 'M', 'L'],
        materials: ['Cotton', 'Polyester'],
      });
      expect(variants).toHaveLength(12);
    });

    test('all SKUs are unique', () => {
      const variants = generateVariantMatrix('Shirt', {
        colors: ['Red', 'Blue', 'Green'],
        sizes: ['S', 'M', 'L', 'XL'],
      });
      const skus = variants.map((v) => v.sku);
      const unique = new Set(skus);
      expect(unique.size).toBe(skus.length);
    });
  });
});
