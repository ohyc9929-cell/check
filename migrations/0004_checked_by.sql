ALTER TABLE checklist_tasks ADD COLUMN checked_by TEXT;

UPDATE checklist_tasks
SET checked_by = CASE WHEN checked = 1 THEN '이전 체크' ELSE NULL END;
