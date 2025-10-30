// Test for Exercise 13: asynchronicity
function simulateApiCall(shouldSucceed: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldSucceed) {
        resolve("Data received successfully!");
      } else {
        reject(new Error("API call failed!"));
      }
    }, 1000);
  });
}

async function fetchData(shouldSucceed: boolean): Promise<void> {
  console.log("Fetching data...");
  try {
    const result = await simulateApiCall(shouldSucceed);
    console.log(`[OK] ${result}`);
  } catch (error) {
    console.error(`[KO] Error: ${(error as Error).message}`);
  }
}

// Chained calls
(async () => {
  await fetchData(true);
  await fetchData(false);
})();

// Non-chained calls
fetchData(true);
fetchData(false);
