CREATE TABLE checklist_group_reset_dates (
    group_name TEXT PRIMARY KEY CHECK (group_name IN ('open', 'middle', 'close')),
    reset_date TEXT NOT NULL
);

CREATE TRIGGER reset_checklist_group_after_reset_insert
AFTER INSERT ON checklist_group_reset_dates
BEGIN
    UPDATE checklist_tasks
    SET checked = 0, checked_by = NULL
    WHERE group_name = NEW.group_name;
END;

CREATE TRIGGER reset_checklist_group_after_reset_date_update
AFTER UPDATE OF reset_date ON checklist_group_reset_dates
WHEN NEW.reset_date > OLD.reset_date
BEGIN
    UPDATE checklist_tasks
    SET checked = 0, checked_by = NULL
    WHERE group_name = NEW.group_name;
END;
