// Test for Exercise 18: bank
class BankAccount {
  public owner: string;
  private balance: number;

  constructor(owner: string, balance: number) {
    this.owner = owner;
    this.balance = balance;
    console.log(`Initial balance: ${this.balance}`);
  }

  deposit(amount: number): void {
    this.balance += amount;
    console.log(`New balance: ${this.balance}`);
  }

  withdraw(amount: number): void {
    if (this.balance >= amount) {
      this.balance -= amount;
      console.log(`Balance: ${this.balance}`);
    } else {
      console.log("Insufficient funds");
      console.log(`Balance: ${this.balance}`);
    }
  }

  checkBalance(): void {
    console.log(`Current balance: ${this.balance}`);
  }
}

const myAccount = new BankAccount("Alice", 1000);
myAccount.deposit(100);
myAccount.withdraw(300);
myAccount.checkBalance();
myAccount.deposit(50);
myAccount.withdraw(10000);
