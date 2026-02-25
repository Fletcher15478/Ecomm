/**
 * Product-specific hero images, carousel flavor images, and long descriptions (not from Square).
 * Carousel shows only the hero + flavors that belong to each product.
 * Merch items use a single product image (no carousel).
 */

const UPLOADS = "/uploads";

/** Merch product → single image (no carousel). */
const MERCH_IMAGES: Record<string, string> = {
  "standard playing cards": `${UPLOADS}/playing-cards.png`,
  "glass water bottle": `${UPLOADS}/water-bottle.png`,
  "memory card game": `${UPLOADS}/memory-game.png`,
  "green kids tee": `${UPLOADS}/green-tee.png`,
  "tan kids tee": `${UPLOADS}/tan-kids-tee.png`,
  "pink kids tee": `${UPLOADS}/pink-shirt.png`,
};

export function isMerchProduct(productName: string): boolean {
  const n = productName.toLowerCase();
  return Object.keys(MERCH_IMAGES).some((key) => n.includes(key) || key.includes(n));
}

/** Default size options for kids tees (used when no product_size_options in DB). */
export function getTeeSizes(productName: string): string[] | null {
  const n = productName.toLowerCase();
  if (n.includes("green kids tee")) return ["2T", "3T", "XS", "S", "M", "L", "XL"];
  if (n.includes("tan kids tee")) return ["XS", "M", "L", "XL"];
  if (n.includes("pink kids tee")) return ["2T", "3T", "4T", "M", "L", "XL"];
  return null;
}

/** Whether product is a multi-pint pack (4 or 6). */
export function getPintCount(productName: string): number {
  const n = productName.toLowerCase();
  if (/pick\s*6|pick-6|pick\s*six/.test(n)) return 6;
  if (/4\s*pack|4-pack/.test(n)) return 4;
  return 0;
}

/** Single image for merch products; null for non-merch. */
export function getMerchProductImage(productName: string): string | null {
  const n = productName.toLowerCase();
  for (const [key, path] of Object.entries(MERCH_IMAGES)) {
    if (n.includes(key)) return path;
  }
  return null;
}

/** Flavor image paths used in carousels. Only include flavors that exist in uploads. */
const FLAVOR_IMAGES: Record<string, string> = {
  "Backyard-Smores": `${UPLOADS}/Backyard-Smores.png`,
  "Best-Chocolate": `${UPLOADS}/Best-Chocolate.png`,
  "Brownie-Batter": `${UPLOADS}/Brownie-Batter.png`,
  "Butter-Pecan": `${UPLOADS}/Butter-Pecan.png`,
  "Chads-Vanilla": `${UPLOADS}/Chads-Vanilla.png`,
  "Coffee-Break": `${UPLOADS}/Coffee-Break.png`,
  "Cookies-n-Cream": `${UPLOADS}/Cookies-n-Cream.png`,
  "Mango-1": `${UPLOADS}/Mango-1.png`,
  "Mint-Chip": `${UPLOADS}/Mint-Chip.png`,
  "Nutty-Pistachio": `${UPLOADS}/Nutty-Pistachio.png`,
};

function flavorPaths(keys: (keyof typeof FLAVOR_IMAGES)[]): string[] {
  return keys.map((k) => FLAVOR_IMAGES[k]).filter(Boolean);
}

/**
 * Returns hero image + only the flavor images for this product (no generic pack).
 * For merch: returns a single product image (no carousel).
 */
export function getCarouselImages(productName: string): string[] {
  const merchImage = getMerchProductImage(productName);
  if (merchImage) return [merchImage];

  const n = productName.toLowerCase();

  // Pick 6: hero pick-6-pints, same flavor set as 4-pack (all flavors for choice)
  if (/pick\s*6|pick-6|pick\s*six/i.test(productName)) {
    const hero = `${UPLOADS}/pick-6-pints.png`;
    const all = Object.values(FLAVOR_IMAGES);
    return [hero, ...all];
  }

  // Best Sellers: hero Best-Sellers.png, only Best Chocolate, Chad's Vanilla, Backyard S'mores, Cookies 'n' Cream
  if (/best\s*seller/i.test(n)) {
    const hero = `${UPLOADS}/Best-Sellers.png`;
    const flavors = flavorPaths(["Best-Chocolate", "Chads-Vanilla", "Backyard-Smores", "Cookies-n-Cream"]);
    return [hero, ...flavors];
  }

  // Coffee Shop / Coffee Collection
  if (/coffee\s*(shop|collection)/i.test(n) || n.includes("coffee shop")) {
    const hero = `${UPLOADS}/Coffee-Shop.png`;
    const flavors = flavorPaths(["Coffee-Break", "Chads-Vanilla", "Best-Chocolate"]);
    return [hero, ...flavors];
  }

  // Dairy-Free Cores
  if (/dairy[- ]?free/i.test(n) || n.includes("dairy-free")) {
    const hero = `${UPLOADS}/Dairy-Free.png`;
    const flavors = flavorPaths(["Brownie-Batter", "Mango-1", "Mint-Chip"]);
    return [hero, ...flavors];
  }

  // Holiday Classics Collection
  if (/holiday|classic\s*collection/i.test(n)) {
    const hero = `${UPLOADS}/holiday-pack.png`;
    const flavors = flavorPaths(["Nutty-Pistachio", "Coffee-Break", "Chads-Vanilla", "Butter-Pecan"]);
    return [hero, ...flavors];
  }

  // Default: 4-pack hero, all flavors
  const hero = `${UPLOADS}/4-pack.png`;
  const all = Object.values(FLAVOR_IMAGES);
  return [hero, ...all];
}

/**
 * Long product descriptions (not from Square). Shown on product detail page.
 * Returns null if no local description for this product.
 */
export function getProductDescription(productName: string): string | null {
  const n = productName.toLowerCase();

  // Merch: Glass Water Bottle
  if (n.includes("glass water bottle")) {
    return "18 oz single wall borosilicate glass bottle with threaded bamboo lid and translucent soft touch finish for cold beverages. Comes individually gift boxed. Hand wash recommended. Do not microwave. Available in Frost White with a Pink Spread Love design.";
  }
  if (n.includes("playing cards")) {
    return "A standard 54-card, poker-sized deck of linen-finish playing cards featuring Millie's signature pints and branding finishes. Cards come shrink-wrapped in a custom Millie's tuck-box with soft-touch vinyl laminate for durability and quality.";
  }
  if (n.includes("memory card game")) {
    return "A 56-card memory matching game featuring 28 pairs of our cutest, proprietary brand icons reflective of everyone's menu favorites! Each deck comes in a clear frosted hinged plastic case for carrying & safe-keeping.";
  }
  // Shirts: no description
  if (n.includes("kids tee") || n.includes("green tee") || n.includes("tan tee") || n.includes("pink tee") || n.includes("pink shirt")) {
    return null;
  }

  if (/holiday|classic\s*collection/i.test(n)) {
    return `Holiday Classics Collection – Celebrate the season with cozy, comforting pints that feel just like home for the holidays.

Nutty Pistachio – A timeless classic with a modern Millie's twist: we've spun sweet Pennsylvania cream with crusted roasted pistachios and just a whiff of all-natural spirulina for that perfect emerald color - no dyes here! We give you the green-light to dive in spoon first-sharing optional.

Coffee Break – Perfect for a case of the Mondays or when you just can't bear the thought of another 3 p.m. conference call. Coffee Break is a smooth, perfectly balanced blend of sweet Pennsylvania cream & freshly brewed, sustainably sourced coffee. Just make sure you keep this baby hidden in the office freezer - right behind Donna's never-to-be-claimed turkey sandwich.

Chad's Vanilla – Chef Chad, Millie's co-founder, is a firm believer, that an ice-cream maker is only as good as their vanilla ice cream. With no caramel or brownies or jam to hide behind, our vanilla ice cream is Chad's fondest creation. We hear from customers that it's their favorite vanilla ice cream in the entire world - and, of course, Chad would agree.

Butter Pecan – When it comes to the scoop-shop classic Butter Pecan, you don't mess with what's tried and true. We folded brown sugar into our grass grazed ice cream and littered it with lots of buttery toasted pecans for a traditional salty-sweet scoop that's perfect for old souls, the young at heart, and everyone in between.`;
  }

  if (/best\s*seller/i.test(n)) {
    return `Millie's Best Sellers – Scoop the Classics

The Best Chocolate – One bite of this ice cream and you'll be transported to a time of fireflies, dinosaur pajamas, and mom's after-school chocolate milk. We've elevated this classic by melting hunks of Guittard 64% chocolate into our creamy cocoa base. The result? A deeply comforting chocolate ice cream that'll take you straight back to a simpler time, bite by bite.

Chad's Vanilla – Chef Chad, Millie's co-founder, is a firm believer that an ice-cream maker is only as good as their vanilla ice cream. With no caramel or brownies or jam to hide behind, our vanilla ice cream is Chad's fondest creation. We hear from customers that it's their favorite vanilla ice cream in the entire world – and, of course, Chad would agree.

Backyard S'mores – We miss summer and childhood but our Backyard S'mores flavor brings us back - silky marshmallow ice cream packed with crispy lotus Biscoff cookies and hunks of milk chocolate bars. Go ahead, grab a pint and set up a tent in your living room. Look, now you're glamping! Wait, can we come?!?

Cookies 'n' Cream – Since its debut in the early eighties, this star flavor has become an ice cream parlor staple, and we are thrilled to give it the Millie's treatment. With clean label cookies and a sweet vanilla ice cream, this classic combination is sure to satisfy every sweet tooth in your household.`;
  }

  if (/coffee\s*(shop|collection)/i.test(n) || n.includes("coffee shop")) {
    return `Coffee Shop Collection – Indulge in cozy café vibes with our "Coffee Shop" ice cream pint collection.

Coffee Break – Perfect for a case of the Mondays or when you just can't bear the thought of another 3 p.m. conference call. Coffee Break is a smooth, perfectly balanced blend of sweet Pennsylvania cream & freshly brewed, sustainably sourced coffee. Just make sure you keep this baby hidden in the office freezer - right behind Donna's never-to-be-claimed turkey sandwich.

Chad's Vanilla – Chef Chad, Millie's co-founder, is a firm believer, that an ice-cream maker is only as good as their vanilla ice cream. With no caramel or brownies or jam to hide behind, our vanilla ice cream is Chad's fondest creation. We hear from customers that it's their favorite vanilla ice cream in the entire world - and, of course, Chad would agree.

Best Chocolate – One bite of The Best Chocolate ice cream will transport you to a time of fireflies, dinosaur pajamas and mom's after-school chocolate milk. We've elevated this classic by melting hunks of Guittard 64% chocolate into our creamy cocoa base. The result? A deeply comforting chocolate ice cream that'll take you straight back to a simpler time, bite by bite.

Dairy-Free Brownie Batter Gelato – Enjoying a pint of our Dark Chocolate Brownie Batter is just like licking the beaters, only WAY safer. Made with a rich blend of cocoas and silky, sustainably-sourced coconut milk, this 100% vegan & gluten-free gelato positively pulses with chocolate. Feel free to lick the bowl - we won't tell!`;
  }

  if (/dairy[- ]?free/i.test(n) || n.includes("dairy-free")) {
    return `Dairy-Free Cores Collection – You won't even miss the moo!

Dairy-Free Very Mango Gelato – This fresh bite of sunshine is a major fan favorite. Only Alphonso mangoes make it into our Very Mango Gelato. Prized worldwide for their unmatched flavor, aroma, and quality, the first taste will bring you right back to where you left off last summer. Throw a pint in your cooler, grab a spoon and dive on in!

Dairy-Free Brownie Batter Gelato – Enjoying a pint of our Dark Chocolate Brownie Batter is just like licking the beaters, only WAY safer. Made with a rich blend of cocoas and silky, sustainably-sourced coconut milk, this 100% vegan & gluten-free gelato positively pulses with chocolate. Feel free to lick the bowl - we won't tell

Dairy-Free Mint Chip Gelato – Our Vegan Mint Chip Gelato is crisp, cool, refreshing and dare-we-say more delicious as a dairy-free treat (yeah, we said it). Fresh peppermint and creamy coconut are perfectly complemented by the sweet crunch of Guittard chocolate chips in every bite. Calling all mint lovers cuz this pint is 100% good vibes, guaranteed.`;
  }

  return null;
}
