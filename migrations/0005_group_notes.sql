CREATE TABLE checklist_group_notes (
    group_name TEXT PRIMARY KEY CHECK (group_name IN ('open', 'middle', 'close')),
    note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 300)
);

INSERT INTO checklist_group_notes (group_name, note)
VALUES ('open', ''), ('middle', ''), ('close', '');
