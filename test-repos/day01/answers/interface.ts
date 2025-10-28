// Test for Exercise 11: Interface Pokemon
interface Pokemon {
  name: string;
  types: string[];
  level: number;
  hp: number;
  isLegendary: boolean;
}

const pokemon: Pokemon = {
  name: 'Pikachu',
  types: ['Electric'],
  level: 25,
  hp: 35,
  isLegendary: false
};

console.log(pokemon);
console.log(pokemon.name);
console.log(pokemon.types);
console.log(pokemon.level);
console.log(pokemon.hp);
console.log(pokemon.isLegendary);
