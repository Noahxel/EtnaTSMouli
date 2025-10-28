// Test for Exercise 17: Const and Let
// This file should FAIL compilation with an error about reassigning const
const schoolName: string = "ETNA";
let schoolAge: number = 21;

schoolAge++;
console.log(schoolAge);

// This line should cause a compilation error
schoolName = "Other School";
