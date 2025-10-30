// Test for Exercise 04: forEach
interface Customer {
  firstname: string;
  lastname: string;
  phone: string;
}

const customers: Customer[] = [
  { firstname: 'victor', lastname: 'ménestrelus', phone: '123-456-7890' },
  { firstname: 'alice', lastname: 'dupont', phone: '987-654-3210' },
  { firstname: 'bob', lastname: 'martin', phone: '555-555-5555' },
  { firstname: 'charlie', lastname: 'brown', phone: '444-444-4444' }
];

console.log("Before modification:", customers);

customers.forEach(customer => {
  customer.firstname = customer.firstname.charAt(0).toUpperCase() + customer.firstname.slice(1);
  customer.lastname = customer.lastname.toUpperCase();
});

console.log("After modification:", customers);
