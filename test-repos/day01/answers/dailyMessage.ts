// Test for Exercise 19: dailyMessage Function
enum DaysOfWeek {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday"
}

function dailyMessage(day: DaysOfWeek): string | null {
  switch (day) {
    case DaysOfWeek.MONDAY:
      return "Start of the work week!";
    case DaysOfWeek.FRIDAY:
      return "TGIF!";
    case DaysOfWeek.SUNDAY:
      return "Have a chill sunday!";
    default:
      return null;
  }
}

console.log(dailyMessage(DaysOfWeek.SUNDAY));
