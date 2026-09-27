CREATE TABLE checklist_tasks (
    id TEXT PRIMARY KEY,
    group_name TEXT NOT NULL CHECK (group_name IN ('open', 'middle', 'close')),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
    checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
    sort_order INTEGER NOT NULL
);

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'open-ingredients', 'open', '재료 및 식자재 확인', checked, 0
FROM checklist_state WHERE task_index = 0;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'open-pos', 'open', '포스기 및 매장 기기 켜기', checked, 1
FROM checklist_state WHERE task_index = 1;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'open-ready', 'open', '매장 오픈 준비 완료', checked, 2
FROM checklist_state WHERE task_index = 2;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'middle-tables', 'middle', '테이블 정리 및 청소', checked, 0
FROM checklist_state WHERE task_index = 3;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'middle-stock', 'middle', '식자재 재고 확인', checked, 1
FROM checklist_state WHERE task_index = 4;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'middle-restock', 'middle', '부족한 재료 보충', checked, 2
FROM checklist_state WHERE task_index = 5;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'middle-recycling', 'middle', '분리수거 확인 및 교체', checked, 3
FROM checklist_state WHERE task_index = 6;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'middle-kitchen', 'middle', '주방 및 매장 정리', checked, 4
FROM checklist_state WHERE task_index = 7;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'middle-handover', 'middle', '마감조에게 특이사항 전달', checked, 5
FROM checklist_state WHERE task_index = 8;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-tables', 'close', '테이블 및 의자 정리', checked, 0
FROM checklist_state WHERE task_index = 9;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-floor', 'close', '매장 바닥 청소', checked, 1
FROM checklist_state WHERE task_index = 10;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-kitchen', 'close', '주방 청소', checked, 2
FROM checklist_state WHERE task_index = 11;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-stock', 'close', '식자재 정리 및 냉장고 확인', checked, 3
FROM checklist_state WHERE task_index = 12;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-trash', 'close', '쓰레기 배출', checked, 4
FROM checklist_state WHERE task_index = 13;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-restroom', 'close', '화장실 최종 확인', checked, 5
FROM checklist_state WHERE task_index = 14;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-pos', 'close', '포스기 및 기기 종료', checked, 6
FROM checklist_state WHERE task_index = 15;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-lights', 'close', '전등 및 에어컨 확인', checked, 7
FROM checklist_state WHERE task_index = 16;

INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order)
SELECT 'close-lock', 'close', '문 잠금 및 최종 퇴점 확인', checked, 8
FROM checklist_state WHERE task_index = 17;

CREATE TABLE admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);

CREATE TABLE admin_login_attempts (
    client_key TEXT PRIMARY KEY,
    failed_count INTEGER NOT NULL,
    window_started_at INTEGER NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0
);

DROP TABLE checklist_state;
