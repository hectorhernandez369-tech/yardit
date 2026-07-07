export const RESIDENTIAL_CATEGORY_GROUPS = [
  { label: "Household", children: ["Household Items", "Kitchen & Dining", "Home Décor", "Furniture", "Appliances"] },
  { label: "Clothing", children: ["Clothing & Accessories", "Shoes", "Jewelry & Watches", "Handbags & Purses"] },
  { label: "Electronics", children: ["Electronics", "Video Games", "Computers & Office"] },
  { label: "Garage", children: ["Tools & Hardware", "Power Tools", "Vehicles & Auto Parts"] },
  { label: "Kids", children: ["Baby & Kids", "Toys & Games", "Board Games & Puzzles"] },
  { label: "Outdoor", children: ["Outdoor & Garden", "Patio Furniture", "Lawn Equipment", "Sports Equipment", "Exercise & Fitness", "RV & Camping", "Fishing & Hunting"] },
  { label: "Collectibles", children: ["Collectibles", "Trading Cards", "Comic Books", "Coins & Currency", "Memorabilia", "Antiques & Vintage"] },
  { label: "Hobby & Crafts", children: ["Arts & Crafts / Handmade", "Sewing & Fabric", "Musical Instruments", "Books & Media", "Movies & Music"] },
  { label: "Food", children: ["Food / Baked Goods", "Fresh Produce"] },
  { label: "Pets", children: ["Pet Supplies"] },
  { label: "Farm & Ranch", children: ["Farm & Ranch"] },
  { label: "Seasonal", children: ["Holiday & Seasonal"] },
  { label: "Free", children: ["Free Items"] },
  { label: "Estate", children: ["Estate Sale Items"] },
  { label: "Misc.", children: ["Office & School Supplies", "Miscellaneous"] },
];

export const RESIDENTIAL_CATEGORIES = RESIDENTIAL_CATEGORY_GROUPS.flatMap((group) => group.children);

const RESIDENTIAL_CATEGORY_ALIASES = {
  "Toys & Games": ["Toys", "Action Figures", "Funko Pops", "Die-cast Cars"],
  "Video Games": ["Video Game Collectibles"],
  "Jewelry & Watches": ["Jewelry"],
  "Trading Cards": ["Sports Cards", "Pokémon Cards", "Trading Cards (Other)"],
  "Comic Books": ["Comics"],
  "Coins & Currency": ["Coins", "Stamps"],
  "Memorabilia": ["Sports Memorabilia", "Movie Memorabilia", "Star Wars Collectibles"],
  "Arts & Crafts / Handmade": ["Art", "Figurines"],
  "Movies & Music": ["Vinyl Records"],
};

export function getResidentialCategoryFilterTerms(category) {
  return [category, ...(RESIDENTIAL_CATEGORY_ALIASES[category] || [])];
}

export function residentialCategoriesMatch(selectedCategories = [], listingCategories = []) {
  if (!selectedCategories.length) return true;
  const normalizedListingCategories = listingCategories.filter(Boolean).map((cat) => String(cat).toLowerCase());
  return selectedCategories.some((category) =>
    getResidentialCategoryFilterTerms(category).some((term) => normalizedListingCategories.includes(String(term).toLowerCase()))
  );
}