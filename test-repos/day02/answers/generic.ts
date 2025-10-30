// Test for Exercise 20: generic
function identity<T>(value: T): T {
  return value;
}

console.log(identity<number>(42));
console.log(identity<string>("Hello Code2Work"));

function getFirstElement<T>(array: T[]): T | undefined {
  return array[0];
}

console.log(getFirstElement<number>([1, 2, 3]));
console.log(getFirstElement<string>(["Alice", "Bob", "Charlie"]));

interface EtnaUser {
  id: string;
  name: string;
  promotion: number;
}

function printUserProperty<T, K extends keyof T>(obj: T, key: K): void {
  console.log(`${String(key)} : ${obj[key]}`);
}

const etnaUser: EtnaUser = {
  id: "cfe5d908-5ba2-437e-bf54-e713eb6b2895",
  name: "Alice",
  promotion: 2026
};

printUserProperty(etnaUser, "name");
printUserProperty(etnaUser, "promotion");
