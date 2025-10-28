// Test for Exercise 08: calculateAverage Function
function calculateAverage(a: number, b: number, c: number): void {
  const average = (a + b + c) / 3;
  console.log(average.toFixed(2).replace('.', ','));
}

calculateAverage(12, 15, 15.5);
