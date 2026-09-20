/**
 * Frontend-only predefined values for common variant attributes.
 * No database fields, no backend endpoints — values are created through the
 * existing `POST /api/v1/catalog/attributes/{id}/options` API.
 *
 * Attributes intentionally left out (e.g. Brand) only offer manual value
 * creation, because their values are normally business-specific.
 */
export const COMMON_ATTRIBUTE_VALUES: Record<string, string[]> = {
  Colour: [
    "Black",
    "White",
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Orange",
    "Pink",
    "Purple",
    "Brown",
    "Grey",
    "Navy",
    "Maroon",
    "Beige",
  ],
  Size: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"],
  Weight: ["100 g", "250 g", "500 g", "1 kg", "2 kg", "5 kg", "10 kg"],
  Volume: ["100 ml", "250 ml", "500 ml", "750 ml", "1 L", "2 L", "5 L"],
  Material: [
    "Cotton",
    "Polyester",
    "Linen",
    "Wool",
    "Leather",
    "Denim",
    "Nylon",
    "Silk",
    "Rayon",
    "Acrylic",
  ],
  Style: [
    "Regular",
    "Classic",
    "Casual",
    "Formal",
    "Slim",
    "Oversized",
    "Modern",
    "Vintage",
  ],
  Pattern: [
    "Solid",
    "Striped",
    "Checked",
    "Printed",
    "Floral",
    "Polka Dot",
    "Geometric",
    "Plain",
  ],
  Length: ["Short", "Medium", "Long", "30 cm", "50 cm", "100 cm", "150 cm"],
  Width: ["Narrow", "Medium", "Wide", "10 cm", "20 cm", "30 cm", "50 cm"],
  Height: ["Short", "Medium", "Tall", "10 cm", "20 cm", "30 cm", "50 cm"],
  Capacity: ["250 ml", "500 ml", "750 ml", "1 L", "1.5 L", "2 L", "5 L", "10 L"],
  Fit: ["Slim Fit", "Regular Fit", "Relaxed Fit", "Loose Fit", "Oversized"],
  Season: ["Spring", "Summer", "Autumn", "Winter", "All Season", "Monsoon"],
};

/**
 * Case-insensitive lookup so "colour", "Colour" and "COLOUR" all match.
 * Returns undefined when no predefined list is configured (manual-only).
 */
export function getQuickValues(attributeName: string): string[] | undefined {
  const target = attributeName.trim().toLowerCase();
  for (const [key, values] of Object.entries(COMMON_ATTRIBUTE_VALUES)) {
    if (key.toLowerCase() === target) return values;
  }
  return undefined;
}
