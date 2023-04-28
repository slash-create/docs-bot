interface AmendNotesConstructor {
  (note: string): AmendNotesConstructor;
  (): string[];
}

export const getNoteInstance = (): AmendNotesConstructor => {
  const notes = [];

  return function $internal(note?: string): AmendNotesConstructor | string[] {
    if (!note) return notes;
    if (notes.indexOf(note) <= -1) notes.push(note);
    return $internal;
  }
}

// const notepad = getNoteInstance();
// notepad('note1');
// notepad('note2');
// notepad('note2');
// console.log(notepad()); // ['note1', 'note2']