CREATE TABLE checklist_state_v2 (
    task_index INTEGER PRIMARY KEY CHECK (task_index >= 0 AND task_index < 18),
    checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1))
);

INSERT INTO checklist_state_v2 (task_index, checked)
SELECT
    CASE task_index
        WHEN 4 THEN 0
        WHEN 6 THEN 1
        WHEN 7 THEN 2
        WHEN 8 THEN 3
        WHEN 9 THEN 4
        WHEN 10 THEN 5
        WHEN 12 THEN 6
        WHEN 13 THEN 7
        WHEN 14 THEN 8
        WHEN 15 THEN 9
        WHEN 16 THEN 10
        WHEN 17 THEN 11
        WHEN 18 THEN 12
        WHEN 19 THEN 13
        WHEN 20 THEN 14
        WHEN 21 THEN 15
        WHEN 22 THEN 16
        WHEN 23 THEN 17
    END,
    checked
FROM checklist_state
WHERE task_index IN (4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23);

DROP TABLE checklist_state;
ALTER TABLE checklist_state_v2 RENAME TO checklist_state;
