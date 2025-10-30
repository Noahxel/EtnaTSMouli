// Test for Exercise 10: default
function sendEmail(subject: string, message: string, signature: string = "– L'équipe Code2Work"): void {
  console.log(`Sujet : ${subject}`);
  console.log(`Message : ${message}`);
  console.log(`Signature : ${signature}\n`);
}

sendEmail("Bienvenue à la Semaine 04 !", "Vous débutez aujourd'hui votre deuxième journée sur Vue.js.");
sendEmail("Bravo pour vos progrès !", "Vous avez terminé la partie sur les boucles en TypeScript.", "-- L'équipe pédagogique ETNA");
