// Test for Exercise 05: map
const numbers: number[] = [842, 17, 593, 1000, 268, 731, 0, 456, 989, 312, 77, 624, 205, 918, 349, 58, 867, 430, 291, 752];

const updatedNumbers: number[] = numbers.map(num => num % 2 === 1 ? num + 1 : num);

console.log(updatedNumbers);
