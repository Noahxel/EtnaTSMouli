// Test for Exercise 16: class properties
class Car {
  public model: string = "Tesla Model Y";
  public color: string = "Red";
  public mileage: number = 32595;
}

const myCar = new Car();
console.log(`Car model: ${myCar.model}`);
console.log(`Car color: ${myCar.color}`);
console.log(`Car mileage: ${myCar.mileage}`);
