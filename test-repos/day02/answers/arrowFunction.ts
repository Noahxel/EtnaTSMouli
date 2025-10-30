// Test for Exercise 19: arrow function
const applyDiscount = (price: number, discount: number): number => {
  return price - (price * discount / 100);
};

const prices: number[] = [100, 250.99, 50, 400, 1574.45, 98, 104.50];

const discountedPrices = prices.map(price => applyDiscount(price, 10));
console.log(`Prices with 10% discount: [${discountedPrices.join(', ')}]`);

const pricesUnder100 = discountedPrices.filter(price => price < 100);
console.log(`Prices under 90 euros: [${pricesUnder100.join(', ')}]`);
