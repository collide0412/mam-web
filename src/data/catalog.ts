import type { FoodItem, MealEntry, Profile, SearchResult } from '../types'
import { normalizeText } from '../utils/nutrition'

export const foodCatalog: FoodItem[] = [
  {
    id: 'pho-bo',
    name: 'Phở bò',
    aliases: ['pho bo', 'pho bo tai', 'pho bo chin', 'phở bò', 'phở'],
    category: 'Món chính',
    cuisine: 'Việt Nam',
    region: 'Hà Nội',
    calories: 420,
    protein: 28,
    carbs: 46,
    fat: 14,
    serving: '1 tô',
    price: 45000,
    source: 'Bảng dinh dưỡng chuẩn',
    confidence: 0.96,
    meal: 'Lunch',
    tags: ['nổi tiếng', 'ăn trưa', 'đầy đủ'],
  },
  {
    id: 'pho-bo-khong-hanh',
    name: 'Phở bò không hành',
    aliases: ['pho bo khong hanh', 'phở không hành'],
    category: 'Món chính',
    cuisine: 'Việt Nam',
    region: 'Hà Nội',
    calories: 390,
    protein: 27,
    carbs: 42,
    fat: 12,
    serving: '1 tô',
    price: 43000,
    source: 'Bảng dinh dưỡng chuẩn',
    confidence: 0.94,
    meal: 'Lunch',
    tags: ['ít gia vị', 'không hành', 'dễ tiêu'],
  },
  {
    id: 'com-tam-suon',
    name: 'Cơm tấm sườn bì chả',
    aliases: ['com tam suon bi cha', 'cơm tấm sườn bì chả', 'com tam'],
    category: 'Món chính',
    cuisine: 'Việt Nam',
    region: 'TP.HCM',
    calories: 640,
    protein: 30,
    carbs: 68,
    fat: 25,
    serving: '1 phần',
    price: 65000,
    source: 'Mẫu dinh dưỡng ăn trưa',
    confidence: 0.9,
    meal: 'Lunch',
    tags: ['no', 'đầy đủ', 'ăn trưa'],
  },
  {
    id: 'banh-mi-trung',
    name: 'Bánh mì trứng',
    aliases: ['banh mi trung', 'bánh mì trứng', 'banh mi'],
    category: 'Thức ăn nhanh',
    cuisine: 'Việt Nam',
    region: 'Nam Bộ',
    calories: 430,
    protein: 19,
    carbs: 52,
    fat: 16,
    serving: '1 ổ',
    price: 32000,
    source: 'Đánh giá khẩu phần',
    confidence: 0.88,
    meal: 'Breakfast',
    tags: ['tiện lợi', 'sáng', 'dễ mang'],
  },
  {
    id: 'bun-cha',
    name: 'Bún chả Hà Nội',
    aliases: ['bun cha', 'bún chả', 'bun cha ha noi'],
    category: 'Món chính',
    cuisine: 'Việt Nam',
    region: 'Hà Nội',
    calories: 500,
    protein: 26,
    carbs: 54,
    fat: 18,
    serving: '1 phần',
    price: 59000,
    source: 'Thực đơn truyền thống',
    confidence: 0.92,
    meal: 'Dinner',
    tags: ['hà nội', 'đậm vị', 'ăn tối'],
  },
  {
    id: 'mi-quang',
    name: 'Mì Quảng',
    aliases: ['mi quang', 'mì quảng', 'mi quang ga'],
    category: 'Món chính',
    cuisine: 'Việt Nam',
    region: 'Quảng Nam',
    calories: 560,
    protein: 24,
    carbs: 62,
    fat: 20,
    serving: '1 tô',
    price: 62000,
    source: 'Thực đơn miền Trung',
    confidence: 0.9,
    meal: 'Lunch',
    tags: ['miền trung', 'ngon', 'ăn trưa'],
  },
  {
    id: 'tra-sua',
    name: 'Trà sữa size M 50% đường',
    aliases: ['tra sua', 'trà sữa', 'milk tea', 'bubble tea'],
    category: 'Đồ uống',
    cuisine: 'Đài Loan/Việt Nam',
    region: 'HCM',
    calories: 260,
    protein: 8,
    carbs: 38,
    fat: 7,
    serving: '1 ly',
    price: 42000,
    source: 'Khẩu phần đồ uống',
    confidence: 0.91,
    meal: 'Snack',
    tags: ['đồ uống', 'dễ uống', 'vừa phải'],
  },
  {
    id: 'ga-ran',
    name: 'Gà rán',
    aliases: ['ga ran', 'fried chicken', 'chicken fry'],
    category: 'Thức ăn nhanh',
    cuisine: 'Mỹ',
    region: 'International',
    calories: 380,
    protein: 26,
    carbs: 22,
    fat: 20,
    serving: '1 suất',
    price: 120000,
    source: 'Thương mại',
    confidence: 0.82,
    meal: 'Dinner',
    tags: ['thực phẩm nhanh', 'tiện lợi'],
  },
  {
    id: 'kimchi-jjigae',
    name: 'Kimchi Jjigae',
    aliases: ['kimchi jjigae', '김치찌개', 'kimchi soup'],
    category: 'Món chính',
    cuisine: 'Hàn Quốc',
    region: 'Seoul',
    calories: 360,
    protein: 24,
    carbs: 18,
    fat: 19,
    serving: '1 tô',
    price: 95000,
    source: 'Món Hàn Quốc',
    confidence: 0.87,
    meal: 'Dinner',
    tags: ['hàn quốc', 'ăn nóng', 'protein cao'],
  },
  {
    id: 'salad-ga',
    name: 'Salad gà',
    aliases: ['salad ga', 'chicken salad', 'salad gà'],
    category: 'Món ăn nhẹ',
    cuisine: 'International',
    region: 'International',
    calories: 290,
    protein: 31,
    carbs: 12,
    fat: 12,
    serving: '1 bát',
    price: 110000,
    source: 'Món ăn lành mạnh',
    confidence: 0.9,
    meal: 'Lunch',
    tags: ['healthy', 'light', 'ít dầu'],
  },
  {
    id: 'banh-cuon',
    name: 'Bánh cuốn',
    aliases: ['banh cuon', 'bánh cuốn'],
    category: 'Món sáng',
    cuisine: 'Việt Nam',
    region: 'Hà Nội',
    calories: 310,
    protein: 18,
    carbs: 36,
    fat: 9,
    serving: '1 đĩa',
    price: 35000,
    source: 'Món sáng truyền thống',
    confidence: 0.88,
    meal: 'Breakfast',
    tags: ['sáng', 'nhẹ', 'dễ ăn'],
  },
  {
    id: 'goi-cuon',
    name: 'Gỏi cuốn tôm thịt',
    aliases: ['goi cuon', 'gỏi cuốn', 'summer rolls'],
    category: 'Món ăn nhẹ',
    cuisine: 'Việt Nam',
    region: 'Đồng bằng sông Cửu Long',
    calories: 220,
    protein: 16,
    carbs: 20,
    fat: 8,
    serving: '2 cuốn',
    price: 38000,
    source: 'Món ăn nhẹ',
    confidence: 0.91,
    meal: 'Snack',
    tags: ['nhẹ', 'ít calo', 'tươi'],
  },
  {
    id: 'sup-lon',
    name: 'Súp lơ luộc',
    aliases: ['sup lo', 'cabbage soup', 'sup lo luoc'],
    category: 'Món phụ',
    cuisine: 'International',
    region: 'International',
    calories: 120,
    protein: 7,
    carbs: 15,
    fat: 4,
    serving: '1 bát',
    price: 24000,
    source: 'Thực đơn nhẹ',
    confidence: 0.86,
    meal: 'Dinner',
    tags: ['vừa đủ', 'ít dầu', 'đồ ăn lành'],
  },
  {
    id: 'ap-chao-ga',
    name: 'Áp chảo ức gà',
    aliases: ['ap chao ga', 'ức gà', 'grilled chicken breast'],
    category: 'Món chính',
    cuisine: 'International',
    region: 'International',
    calories: 290,
    protein: 38,
    carbs: 6,
    fat: 11,
    serving: '1 suất',
    price: 95000,
    source: 'Món ăn protein',
    confidence: 0.92,
    meal: 'Dinner',
    tags: ['protein cao', 'ít carb', 'ăn khỏe'],
  },
  {
    id: 'com-rau-cau',
    name: 'Cơm rau củ',
    aliases: ['com rau cu', 'rice bowl veg', 'cơm rau'],
    category: 'Món chính',
    cuisine: 'Việt Nam',
    region: 'TP.HCM',
    calories: 330,
    protein: 15,
    carbs: 42,
    fat: 10,
    serving: '1 bát',
    price: 45000,
    source: 'Món tổng hợp',
    confidence: 0.88,
    meal: 'Lunch',
    tags: ['rau củ', 'đủ chất', 'dinh dưỡng'],
  },
]

export function getFoodById(id: string): FoodItem | undefined {
  return foodCatalog.find((food) => food.id === id)
}

export function searchFoods(query: string, favorites: string[] = [], recent: string[] = []): SearchResult[] {
  const normalized = normalizeText(query)

  if (!normalized) {
    return foodCatalog.slice(0, 8).map((food) => ({ ...food, score: 100 }))
  }

  return foodCatalog
    .map((food) => {
      const haystacks = [food.name, ...food.aliases].map(normalizeText)
      const favoriteBoost = favorites.includes(food.id) ? 38 : 0
      const recentBoost = recent.includes(food.id) ? 24 : 0

      let score = 0
      const name = normalizeText(food.name)

      if (name === normalized || haystacks.some((item) => item === normalized)) score += 220
      if (name.startsWith(normalized) || haystacks.some((item) => item.startsWith(normalized))) score += 120
      if (haystacks.some((item) => item.includes(normalized))) score += 70
      if (food.aliases.some((alias) => normalizeText(alias).includes(normalized))) score += 55
      if (name.includes(normalized)) score += 40

      score += Math.max(0, 30 - Math.abs(food.calories - 400) / 10)
      score += favoriteBoost + recentBoost

      return { ...food, score }
    })
    .filter((food) => food.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

export function getRecommendationCandidates(profile: Profile, recentMeals: MealEntry[] = []): FoodItem[] {
  const recentFoodIds = new Set(recentMeals.map((meal) => meal.foodId))
  const allergens = profile.allergens.map((item) => normalizeText(item))

  return foodCatalog
    .filter((food) => {
      const foodTags = [food.name, ...food.aliases, ...food.tags].map(normalizeText)
      const hasAllergen = allergens.some((allergen) => foodTags.some((tag) => tag.includes(allergen)))
      const isRepeated = recentFoodIds.has(food.id)
      return !hasAllergen && !isRepeated
    })
    .map((food) => {
      let score = food.confidence * 150
      const profileText = [profile.name, profile.region, ...profile.dietary].map(normalizeText).join(' ')
      const foodText = [food.name, food.region, food.cuisine, ...food.tags].map(normalizeText).join(' ')

      if (profileText.includes('khong cay') || profileText.includes('it cay')) {
        if (foodTagsContains(food, ['khong cay', 'it cay', 'healthy', 'light'])) score += 18
      }
      if (food.region.toLowerCase().includes(profile.region.toLowerCase().slice(0, 6)) || profile.region.includes(food.region.slice(0, 3))) {
        score += 14
      }
      if (foodText.includes('pho') || foodText.includes('bun cha') || foodText.includes('com tam')) score += 20
      if (food.calories < 400) score += 10
      if (food.protein > 24) score += 12
      if (food.meal === 'Breakfast' && profile.language === 'vi') score += 7
      if (food.meal === 'Dinner' && profile.language === 'en') score += 5
      score += food.price < 70000 ? 10 : 0
      return { ...food, _score: score }
    })
    .sort((a, b) => (b as FoodItem & { _score: number })._score - (a as FoodItem & { _score: number })._score)
    .slice(0, 4)
    .map((food) => ({ ...food, name: `${food.name} • ${profile.name}` }))
}

function foodTagsContains(food: FoodItem, values: string[]): boolean {
  return [food.name, ...food.aliases, ...food.tags].some((value) =>
    values.some((needle) => normalizeText(value).includes(normalizeText(needle))),
  )
}
