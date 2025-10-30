// Test for Exercise 08: custom type
type ID = number | string;
type EventType = "kickoff" | "workshop" | "followup" | "delivery" | "defense";

interface EtnaEvent {
  id: ID;
  name: string;
  eventType: EventType;
}

const etnaEvent: EtnaEvent = {
  id: 12,
  name: "IDV-VUJS - day02 - ex08",
  eventType: "followup"
};

console.log(etnaEvent);

etnaEvent.id = "cfe5d908-5ba2-437e-bf54-e713eb6b2895";
etnaEvent.eventType = "workshop";

console.log(etnaEvent);

// These lines will cause TypeScript errors (commented out to allow compilation)
// etnaEvent.id = true;
// etnaEvent.eventType = "meeting";
