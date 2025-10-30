// Test for Exercise 09: optional
// Redefining ID type for this exercise
type ID = number | string;

interface User {
  id: ID;
  firstname: string;
  middlename?: string;
  lastname: string;
  phone?: string;
  address?: string;
}

const user: User = {
  id: "cfe5d908-5ba2-437e-bf54-e713eb6b2895",
  firstname: "Patrick",
  lastname: "Ravassard"
};

console.log(user);

user.middlename = "Emmanuel";
user.phone = "+33 6 06 06 06 06";
user.address = "66, Avenue des Champs-Elysées, 75008, Paris";

console.log(user);
