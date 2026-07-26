const stateToSave = {
  xp: 10,
  level: 2
};
const stringified1 = JSON.stringify(stateToSave);
const parsed = JSON.parse(stringified1);
const stringified2 = JSON.stringify(parsed);
console.log(stringified1 === stringified2); // true for normal parse

// But Firestore might return them in a different order? Or maybe not?
