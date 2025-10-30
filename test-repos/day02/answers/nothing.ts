// Test for Exercise 11: nothing
function getUserName(user: { name?: string }): string | undefined | null {
  if (user.name === undefined) {
    return undefined;
  }
  if (user.name === null) {
    return null;
  }
  return user.name;
}

function processValue(value: unknown): void {
  if (typeof value === "string") {
    console.log(`Longueur de la chaîne : ${value.length}`);
  } else if (typeof value === "number") {
    console.log(`Valeur multipliée par 2 : ${value * 2}`);
  } else {
    console.log("Type non reconnu");
  }
}

function logMessage(message: string): void {
  console.log(message);
}

console.log("=== Test getUserName: ===");
console.log(getUserName({ name: "Alice" }));
console.log(getUserName({}));

console.log("\n=== Test processValue: ===");
processValue("Hello");
processValue(21);
processValue(true);
processValue({ key: "value" });

console.log("\n=== Test logMessage: ===");
logMessage("Ceci est un message de test");
logMessage("TypeScript est génial !");
