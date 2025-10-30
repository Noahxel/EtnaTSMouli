// Test for Exercise 14: class
class Student {}

const studentInstance = new Student();
console.log(studentInstance instanceof Student);

const foo: any = {};
console.log(foo instanceof Student);
