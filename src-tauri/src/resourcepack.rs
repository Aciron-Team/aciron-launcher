

use std::io::Write;
use std::path::Path;

pub const BADGE_CODEPOINT: &str = "E010";

const PACK_FILE: &str = "aciron-badges.zip";
const GLYPH: &[u8] = include_bytes!("../resources/badge-glyph.png");

fn pack_format(version: &str) -> u32 {
    let n: Vec<u32> = version
        .split('.')
        .map(|p| p.chars().take_while(|c| c.is_ascii_digit()).collect::<String>())
        .map(|p| p.parse().unwrap_or(0))
        .collect();
    let minor = n.get(1).copied().unwrap_or(0);
    let patch = n.get(2).copied().unwrap_or(0);
    match (minor, patch) {
        (0..=14, _) => 4,
        (15, _) => 5,
        (16, 0..=1) => 5,
        (16, _) => 6,
        (17, _) => 7,
        (18, _) => 8,
        (19, 0..=2) => 9,
        (19, 3) => 12,
        (19, _) => 13,
        (20, 0..=1) => 15,
        (20, 2) => 18,
        (20, 3..=4) => 22,
        (20, _) => 32,
        (21, 0..=1) => 34,
        (21, 2..=3) => 42,

        _ => 46,
    }
}

fn mcmeta(version: &str) -> String {
    format!(
        r#"{{
  "pack": {{
    "pack_format": {},
    "supported_formats": {{ "min_inclusive": 1, "max_inclusive": 99 }},
    "description": "Значки Aciron Launcher"
  }}
}}"#,
        pack_format(version)
    )
}

fn font_json() -> String {
    format!(
        r#"{{
  "providers": [
    {{
      "type": "bitmap",
      "file": "aciron:font/badge.png",
      "height": 8,
      "ascent": 7,
      "chars": ["\u{}"]
    }}
  ]
}}"#,
        BADGE_CODEPOINT
    )
}

pub fn ensure(game_dir: &Path, version: &str) {
    if let Err(e) = write_pack(game_dir, version) {
        eprintln!("[resourcepack] не собрался ({e}) — значков в игре не будет");
        return;
    }
    if let Err(e) = enable_in_options(game_dir) {
        eprintln!("[resourcepack] не включился в options.txt ({e})");
    }
}

fn write_pack(game_dir: &Path, version: &str) -> std::io::Result<()> {
    let dir = game_dir.join("resourcepacks");
    std::fs::create_dir_all(&dir)?;
    let file = std::fs::File::create(dir.join(PACK_FILE))?;
    let mut zip = zip::ZipWriter::new(file);
    let opts: zip::write::FileOptions<'_, ()> =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("pack.mcmeta", opts)?;
    zip.write_all(mcmeta(version).as_bytes())?;
    zip.start_file("assets/minecraft/font/default.json", opts)?;
    zip.write_all(font_json().as_bytes())?;
    zip.start_file("assets/aciron/textures/font/badge.png", opts)?;
    zip.write_all(GLYPH)?;
    zip.finish()?;
    Ok(())
}

/// Дописывает пак в список включённых в options.txt.
///
/// Файла может не быть вовсе — при первом запуске игра создаёт его сама. Тогда
/// не выдумываем настройки за игрока, а пишем только нужную строку: остальное
/// игра допишет со своими значениями по умолчанию.
fn enable_in_options(game_dir: &Path) -> std::io::Result<()> {
    let path = game_dir.join("options.txt");
    let entry = format!("\"file/{PACK_FILE}\"");
    let text = std::fs::read_to_string(&path).unwrap_or_default();

    let mut out = String::with_capacity(text.len() + 64);
    let mut found = false;
    for line in text.lines() {
        if let Some(rest) = line.strip_prefix("resourcePacks:") {
            found = true;
            if rest.contains(PACK_FILE) {
                // Уже включён — не трогаем: игрок мог поменять порядок паков.
                out.push_str(line);
            } else {
                // В конец списка: пак с нашим шрифтом должен идти после
                // остальных, иначе чужой пак со своим default.json перекроет наш.
                let trimmed = rest.trim();
                let inner = trimmed
                    .strip_prefix('[')
                    .and_then(|s| s.strip_suffix(']'))
                    .unwrap_or("")
                    .trim();
                let list = if inner.is_empty() {
                    entry.clone()
                } else {
                    format!("{inner},{entry}")
                };
                out.push_str(&format!("resourcePacks:[{list}]"));
            }
        } else {
            out.push_str(line);
        }
        out.push('\n');
    }
    if !found {
        out.push_str(&format!("resourcePacks:[{entry}]\n"));
    }

    std::fs::write(&path, out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Читает строку resourcePacks из options.txt после ensure-обработки.
    fn packs_line(initial: Option<&str>) -> String {
        let dir = std::env::temp_dir().join(format!("aciron-rp-{}", rand::random::<u64>()));
        std::fs::create_dir_all(&dir).unwrap();
        if let Some(t) = initial {
            std::fs::write(dir.join("options.txt"), t).unwrap();
        }
        enable_in_options(&dir).unwrap();
        let text = std::fs::read_to_string(dir.join("options.txt")).unwrap();
        std::fs::remove_dir_all(&dir).ok();
        text.lines()
            .find(|l| l.starts_with("resourcePacks:"))
            .unwrap_or("")
            .to_string()
    }

    #[test]
    fn создаёт_строку_когда_файла_нет() {
        assert_eq!(packs_line(None), "resourcePacks:[\"file/aciron-badges.zip\"]");
    }

    #[test]
    fn создаёт_строку_когда_её_нет_в_файле() {
        let line = packs_line(Some("fov:70\nlang:ru_ru\n"));
        assert_eq!(line, "resourcePacks:[\"file/aciron-badges.zip\"]");
    }

    #[test]
    fn дописывает_в_конец_существующего_списка() {
        let line = packs_line(Some("resourcePacks:[\"vanilla\",\"file/faithful.zip\"]\n"));
        assert_eq!(
            line,
            "resourcePacks:[\"vanilla\",\"file/faithful.zip\",\"file/aciron-badges.zip\"]"
        );
    }

    #[test]
    fn справляется_с_пустым_списком() {
        let line = packs_line(Some("resourcePacks:[]\n"));
        assert_eq!(line, "resourcePacks:[\"file/aciron-badges.zip\"]");
    }

    #[test]
    fn не_дублирует_уже_включённый_пак() {
        // И, что важнее, не переставляет: порядок мог быть выбран игроком.
        let before = "resourcePacks:[\"file/aciron-badges.zip\",\"vanilla\"]";
        assert_eq!(packs_line(Some(&format!("{before}\n"))), before);
    }

    #[test]
    fn остальные_настройки_не_теряются() {
        let dir = std::env::temp_dir().join(format!("aciron-rp2-{}", rand::random::<u64>()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("options.txt"), "fov:70\nresourcePacks:[]\nlang:ru_ru\n").unwrap();
        enable_in_options(&dir).unwrap();
        let text = std::fs::read_to_string(dir.join("options.txt")).unwrap();
        std::fs::remove_dir_all(&dir).ok();
        assert!(text.contains("fov:70"));
        assert!(text.contains("lang:ru_ru"));
    }

    #[test]
    fn описание_шрифта_содержит_тот_же_символ_что_уходит_агенту() {
        // Ровно та ошибка, ради которой символ не дублируется константой:
        // разъехавшиеся значения дали бы пустой квадрат вместо значка.
        assert!(font_json().contains(&format!("\\u{BADGE_CODEPOINT}")));
    }

    #[test]
    fn формат_пака_растёт_вместе_с_версией() {
        assert_eq!(pack_format("1.14.4"), 4);
        assert_eq!(pack_format("1.16.1"), 5);
        assert_eq!(pack_format("1.16.5"), 6);
        assert_eq!(pack_format("1.20.1"), 15);
        assert!(pack_format("1.21.4") >= 42);
    }
}
