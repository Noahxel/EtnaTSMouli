// Test for Exercise 20: displayAverageForStudent Function
interface Student {
  firstname: string;
  lastname: string;
}

function displayAverageForStudent(student: Student, grades: number[]): void {
  const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
  const roundedAverage = Math.round(average * 10) / 10;
  
  console.log(`${student.firstname} a une moyenne de ${roundedAverage}`);
  
  if (roundedAverage < 10) {
    console.log("C'est insuffisant...");
  } else if (roundedAverage >= 10 && roundedAverage < 15) {
    console.log("C'est passable.");
  } else {
    console.log("C'est excellent !");
  }
}

const student: Student = {
  firstname: 'Antoine',
  lastname: 'Dupont'
};

displayAverageForStudent(student, [5, 8.8, 9, 6]);
