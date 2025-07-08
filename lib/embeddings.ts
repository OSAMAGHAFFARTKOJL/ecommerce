// Enhanced local embeddings library with better search capabilities

export async function generateEmbedding(text: string): Promise<number[]> {
  return generateEnhancedEmbedding(text, 384)
}

export function generateEnhancedEmbedding(text: string, dimensions = 384): number[] {
  // Clean and normalize the text
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const words = cleanText.split(" ").filter((word) => word.length > 1)

  if (words.length === 0) {
    return new Array(dimensions).fill(0)
  }

  const vector = new Array(dimensions).fill(0)

  // Enhanced word processing with better distribution
  words.forEach((word, index) => {
    // Multiple hash functions for better distribution
    const hash1 = simpleHash(word) % dimensions
    const hash2 = simpleHash(word + "_semantic") % dimensions
    const hash3 = simpleHash(word + "_context") % dimensions
    const hash4 = simpleHash(word.substring(0, 3)) % dimensions // Prefix matching

    // Weight based on position (earlier words are more important)
    const positionWeight = 1.0 / Math.sqrt(index + 1)

    // Add to multiple positions for better matching
    vector[hash1] += positionWeight * 2.0
    vector[hash2] += positionWeight * 1.5
    vector[hash3] += positionWeight * 1.0
    vector[hash4] += positionWeight * 0.5

    // Add word length information
    const lengthHash = simpleHash(word + "_len_" + word.length) % dimensions
    vector[lengthHash] += 0.3
  })

  // Add n-gram features for better partial matching
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + "_" + words[i + 1]
    const bigramHash = simpleHash(bigram) % dimensions
    vector[bigramHash] += 0.8
  }

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude
    }
  }

  return vector
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

export async function generateProductEmbedding(product: {
  name: string
  description: string
  category: string
  tags?: string[]
}): Promise<number[]> {
  // Create comprehensive text with enhanced search terms
  const searchTerms = generateEnhancedSearchTerms(product.name, product.category, product.description)

  const text = [product.name, product.description, product.category, ...(product.tags || []), searchTerms]
    .filter(Boolean)
    .join(" ")

  return generateEmbedding(text)
}

function generateEnhancedSearchTerms(name: string, category: string, description = ""): string {
  const terms = new Set<string>()
  const nameLower = name.toLowerCase()
  const categoryLower = category.toLowerCase()
  const descLower = description.toLowerCase()

  // Add the original words
  terms.add(name.toLowerCase())
  terms.add(category.toLowerCase())

  // Brand detection with variations
  const brands = {
    apple: ["apple", "iphone", "ipad", "macbook", "mac", "ios"],
    samsung: ["samsung", "galaxy", "note"],
    nike: ["nike", "air", "jordan", "swoosh"],
    sony: ["sony", "playstation", "bravia"],
    google: ["google", "pixel", "android"],
    microsoft: ["microsoft", "xbox", "surface", "windows"],
    tesla: ["tesla", "model", "electric"],
    gucci: ["gucci", "luxury", "designer"],
    dyson: ["dyson", "vacuum", "cyclone"],
    herman: ["herman", "miller", "aeron"],
    kitchenaid: ["kitchenaid", "mixer", "kitchen"],
    vitamix: ["vitamix", "blender", "smoothie"],
    breville: ["breville", "espresso", "coffee"],
    levis: ["levis", "levi", "denim", "jeans"],
    patagonia: ["patagonia", "outdoor", "jacket"],
  }

  Object.entries(brands).forEach(([brand, variations]) => {
    if (nameLower.includes(brand) || descLower.includes(brand)) {
      variations.forEach((v) => terms.add(v))
    }
  })

  // Category-specific terms with more variations
  const categoryTerms = {
    electronics: [
      "electronics",
      "electronic",
      "gadget",
      "device",
      "tech",
      "technology",
      "smart",
      "digital",
      "wireless",
    ],
    computers: [
      "computer",
      "computers",
      "pc",
      "laptop",
      "notebook",
      "desktop",
      "tech",
      "technology",
      "portable",
      "work",
      "business",
    ],
    fashion: ["fashion", "clothing", "clothes", "apparel", "wear", "style", "designer", "trendy", "outfit"],
    "home & garden": ["home", "house", "garden", "furniture", "kitchen", "appliance", "household", "domestic"],
    books: ["book", "books", "read", "reading", "literature", "novel", "text"],
    gaming: ["gaming", "game", "games", "play", "console", "video", "entertainment"],
  }

  Object.entries(categoryTerms).forEach(([cat, searchTerms]) => {
    if (categoryLower.includes(cat.toLowerCase())) {
      searchTerms.forEach((term) => terms.add(term))
    }
  })

  // Product-specific terms with more variations
  const productPatterns = [
    {
      patterns: ["phone", "iphone", "smartphone"],
      terms: ["phone", "mobile", "smartphone", "cell", "cellular", "communication", "call", "device"],
    },
    {
      patterns: ["laptop", "macbook", "notebook"],
      terms: ["laptop", "computer", "notebook", "portable", "work", "productivity", "business"],
    },
    {
      patterns: ["shoe", "shoes", "sneaker", "boot"],
      terms: ["shoes", "footwear", "sneakers", "running", "walking", "sport", "athletic"],
    },
    {
      patterns: ["chair", "seat", "stool"],
      terms: ["chair", "seat", "seating", "furniture", "office", "desk", "ergonomic", "comfort"],
    },
    {
      patterns: ["headphone", "earphone", "earbud"],
      terms: ["headphones", "audio", "music", "sound", "wireless", "bluetooth", "listening"],
    },
    {
      patterns: ["tv", "television", "monitor"],
      terms: ["tv", "television", "screen", "display", "entertainment", "viewing", "smart"],
    },
    {
      patterns: ["coffee", "espresso", "brew"],
      terms: ["coffee", "espresso", "brew", "brewing", "cafe", "barista", "drink"],
    },
    { patterns: ["vacuum", "cleaner"], terms: ["vacuum", "cleaning", "cleaner", "suction", "floor", "carpet"] },
    { patterns: ["mixer", "blend"], terms: ["mixer", "mixing", "kitchen", "cooking", "baking", "food"] },
    { patterns: ["jacket", "coat"], terms: ["jacket", "coat", "outerwear", "clothing", "warm", "weather"] },
  ]

  productPatterns.forEach(({ patterns, terms: productTerms }) => {
    if (patterns.some((pattern) => nameLower.includes(pattern) || descLower.includes(pattern))) {
      productTerms.forEach((term) => terms.add(term))
    }
  })

  // Add partial word matches for better search
  const words = nameLower.split(/\s+/)
  words.forEach((word) => {
    if (word.length > 3) {
      terms.add(word.substring(0, 3)) // First 3 characters
      terms.add(word.substring(0, 4)) // First 4 characters
    }
  })

  return Array.from(terms).join(" ")
}
