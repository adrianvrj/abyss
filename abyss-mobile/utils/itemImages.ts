// Item image mapping - React Native requires static paths
export const itemImages: { [key: number]: any } = {
  1: require('../assets/images/item1.png'),
  2: require('../assets/images/item2.png'),
  3: require('../assets/images/item3.png'),
  4: require('../assets/images/item4.png'),
  5: require('../assets/images/item5.png'),
  6: require('../assets/images/item6.png'),
  7: require('../assets/images/item7.png'),
  8: require('../assets/images/item8.png'),
  9: require('../assets/images/item9.png'),
  10: require('../assets/images/item10.png'),
  11: require('../assets/images/item11.png'),
  12: require('../assets/images/item12.png'),
  13: require('../assets/images/item13.png'),
  14: require('../assets/images/item14.png'),
  15: require('../assets/images/item15.png'),
  16: require('../assets/images/item16.png'),
  17: require('../assets/images/item17.png'),
  18: require('../assets/images/item18.png'),
  19: require('../assets/images/item19.png'),
  20: require('../assets/images/item20.png'),
  21: require('../assets/images/item21.png'),
  22: require('../assets/images/item22.png'),
  23: require('../assets/images/item23.png'),
  24: require('../assets/images/item24.png'),
  25: require('../assets/images/item25.png'),
  26: require('../assets/images/item26.png'),
  27: require('../assets/images/item27.png'),
  28: require('../assets/images/item28.png'),
  29: require('../assets/images/item29.png'),
  30: require('../assets/images/item30.png'),
  31: require('../assets/images/item31.png'),
  32: require('../assets/images/item32.png'),
};

export function getItemImage(itemId: number) {
  return itemImages[itemId] || itemImages[1]; // Fallback to item 1 if not found
}
