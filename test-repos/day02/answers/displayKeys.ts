// Test for Exercise 03: displayKeys function
interface Module {
  id: number;
  name: string;
  credits: number;
}

function displayKeys(module: Module): void {
  for (const key in module) {
    console.log(key);
  }
}

const etnaModule: Module = {
  id: 1,
  name: "TypeScript Basics",
  credits: 5
};

displayKeys(etnaModule);
