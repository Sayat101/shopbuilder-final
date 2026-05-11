/**
 * Generates a SKU from product title and variant attributes.
 * Example: title="Sweater", {color:"Red", size:"L", material:"Cotton"}
 * → "SWEATER-RED-L-COTTON"
 */
function generateSKU(title, attributes = {}) {
  const base = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

  const parts = [base];

  if (attributes.color) parts.push(attributes.color.toUpperCase().replace(/\s+/g, ''));
  if (attributes.size) parts.push(attributes.size.toUpperCase().replace(/\s+/g, ''));
  if (attributes.material) parts.push(attributes.material.toUpperCase().replace(/\s+/g, ''));

  return parts.join('-');
}

/**
 * Generates ALL combinations (variant matrix) from attribute arrays.
 * Example:
 *   colors: ["Red","Blue"], sizes: ["S","M"], materials: ["Cotton"]
 *   → 4 variants: RED-S-COTTON, RED-M-COTTON, BLUE-S-COTTON, BLUE-M-COTTON
 */
function generateVariantMatrix(title, options = {}) {
  const colors = options.colors || [null];
  const sizes = options.sizes || [null];
  const materials = options.materials || [null];

  const variants = [];

  for (const color of colors) {
    for (const size of sizes) {
      for (const material of materials) {
        const attrs = {};
        if (color) attrs.color = color;
        if (size) attrs.size = size;
        if (material) attrs.material = material;

        variants.push({
          sku: generateSKU(title, attrs),
          option1Value: color || null,
          option2Value: size || null,
          option3Value: material || null,
        });
      }
    }
  }

  return variants;
}

module.exports = { generateSKU, generateVariantMatrix };
