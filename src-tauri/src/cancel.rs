use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};

fn set() -> &'static Mutex<HashSet<String>> {
    static S: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(HashSet::new()))
}

/// Просит прервать загрузку: качающийся файл бросается на полуслове,
/// соединение закрывается, недокачанный файл удаляется.
#[tauri::command]
pub fn cancel_download(id: String) {
    set().lock().map(|mut s| s.insert(id)).ok();
}

/// Отменена ли операция с этим ключом.
pub fn is_cancelled(id: &str) -> bool {
    set().lock().map(|s| s.contains(id)).unwrap_or(false)
}

/// Снимает пометку — вызывается в начале новой операции с тем же ключом.
pub fn reset(id: &str) {
    set().lock().map(|mut s| s.remove(id)).ok();
}

/// Текст ошибки, по которому фронт понимает, что это отмена, а не сбой.
pub const CANCELLED: &str = "Загрузка отменена";
