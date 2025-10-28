// Test for Exercise 12: displayFullName Function
interface User {
  firstname: string;
  lastname: string;
  age: number;
  email: string;
  isActive: boolean;
}

function displayFullName(user: User): void {
  console.log(`${user.firstname} ${user.lastname}`);
}

const user: User = {
  firstname: 'Marie',
  lastname: 'Curie',
  age: 157,
  email: 'marie.curie@etna.io',
  isActive: false
};

console.log(user);
displayFullName(user);
