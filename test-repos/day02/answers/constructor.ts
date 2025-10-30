// Test for Exercise 17: constructor
class Book {
  public title: string;
  public author: string;
  public year: number;

  constructor(title: string, author: string, year: number) {
    this.title = title;
    this.author = author;
    this.year = year;
  }
}

const myBook = new Book("La Délicatesse", "David Foenkinos", 2009);

console.log(myBook);
console.log(`Title: ${myBook.title}`);
console.log(`Author: ${myBook.author}`);
console.log(`Year: ${myBook.year}`);
