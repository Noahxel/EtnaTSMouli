// Test for Exercise 06: displayWeatherMessage function
enum Weather {
  Sunny = "Sunny",
  Rainy = "Rainy",
  Cloudy = "Cloudy",
  Snowy = "Snowy",
  Stormy = "Stormy",
  Windy = "Windy"
}

function displayWeatherMessage(weather: Weather): void {
  switch (weather) {
    case Weather.Sunny:
      console.log("It's a bright and sunny day! ☀️");
      break;
    case Weather.Rainy:
      console.log("Don't forget your umbrella! ☔️");
      break;
    case Weather.Cloudy:
      console.log("Looks like it might rain later. ☁️");
      break;
    case Weather.Snowy:
      console.log("Time for a snowball fight! ❄️");
      break;
    case Weather.Stormy:
      console.log("Stay inside, it's dangerous out there! ⛈️");
      break;
    case Weather.Windy:
      console.log("Hold on to your hat! 💨");
      break;
    default:
      console.log("Unknown weather condition.");
  }
}

displayWeatherMessage(Weather.Snowy);
displayWeatherMessage(Weather.Sunny);
displayWeatherMessage(Weather.Windy);
displayWeatherMessage(Weather.Cloudy);
displayWeatherMessage("Unknown" as any);
displayWeatherMessage(Weather.Rainy);
displayWeatherMessage(Weather.Stormy);
