use impressplayer_lib::commands::fs_ops;
use impressplayer_lib::commands::presentation;
use impressplayer_lib::commands::zip_ops;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

fn temp_dir() -> TempDir {
    tempfile::tempdir().unwrap()
}

// ── fs_ops ──────────────────────────────────────────────────────

#[test]
fn test_write_and_read_file() {
    let dir = temp_dir();
    let path = dir.path().join("test.txt");
    let path_str = path.to_string_lossy().to_string();

    fs_ops::write_file(path_str.clone(), "hello world".into()).unwrap();
    let content = fs_ops::read_file(path_str.clone()).unwrap();
    assert_eq!(content, "hello world");
}

#[test]
fn test_file_exists() {
    let dir = temp_dir();
    let path = dir.path().join("exists.txt");
    let path_str = path.to_string_lossy().to_string();

    assert!(!fs_ops::file_exists(path_str.clone()).unwrap());
    fs_ops::write_file(path_str.clone(), "x".into()).unwrap();
    assert!(fs_ops::file_exists(path_str.clone()).unwrap());
}

#[test]
fn test_read_file_missing() {
    let result = fs_ops::read_file("/nonexistent/file/path.txt".into());
    assert!(result.is_err());
}

#[test]
fn test_write_file_creates_dirs() {
    let dir = temp_dir();
    let path = dir.path().join("sub").join("dir").join("file.txt");
    let path_str = path.to_string_lossy().to_string();

    fs_ops::write_file(path_str.clone(), "nested".into()).unwrap();
    assert!(fs_ops::file_exists(path_str.clone()).unwrap());
    assert_eq!(fs_ops::read_file(path_str).unwrap(), "nested");
}

#[test]
fn test_read_dir() {
    let dir = temp_dir();
    let dir_str = dir.path().to_string_lossy().to_string();

    fs_ops::write_file(dir.path().join("a.txt").to_string_lossy().to_string(), "a".into()).unwrap();
    fs_ops::write_file(dir.path().join("b.txt").to_string_lossy().to_string(), "b".into()).unwrap();

    let entries = fs_ops::read_dir(dir_str).unwrap();
    assert_eq!(entries.len(), 2);
    assert!(entries.iter().any(|e| e.ends_with("a.txt")));
    assert!(entries.iter().any(|e| e.ends_with("b.txt")));
}

#[test]
fn test_create_dir() {
    let dir = temp_dir();
    let nested = dir.path().join("a").join("b").join("c");
    let nested_str = nested.to_string_lossy().to_string();

    fs_ops::create_dir(nested_str.clone()).unwrap();
    assert!(nested.exists());
}

#[test]
fn test_remove_file() {
    let dir = temp_dir();
    let path = dir.path().join("to_delete.txt");
    let path_str = path.to_string_lossy().to_string();

    fs_ops::write_file(path_str.clone(), "delete me".into()).unwrap();
    assert!(fs_ops::file_exists(path_str.clone()).unwrap());

    fs_ops::remove_file(path_str.clone()).unwrap();
    assert!(!fs_ops::file_exists(path_str).unwrap());
}

#[test]
fn test_remove_dir() {
    let dir = temp_dir();
    let sub = dir.path().join("to_delete_dir");
    let sub_str = sub.to_string_lossy().to_string();

    fs_ops::create_dir(sub_str.clone()).unwrap();
    fs_ops::write_file(sub.join("file.txt").to_string_lossy().to_string(), "x".into()).unwrap();

    fs_ops::remove_dir(sub_str.clone()).unwrap();
    assert!(!fs_ops::file_exists(sub_str).unwrap());
}

#[test]
fn test_rename_file() {
    let dir = temp_dir();
    let from = dir.path().join("old.txt");
    let to = dir.path().join("new.txt");
    let from_str = from.to_string_lossy().to_string();
    let to_str = to.to_string_lossy().to_string();

    fs_ops::write_file(from_str.clone(), "rename me".into()).unwrap();
    fs_ops::rename_file(from_str.clone(), to_str.clone()).unwrap();

    assert!(!fs_ops::file_exists(from_str).unwrap());
    assert_eq!(fs_ops::read_file(to_str).unwrap(), "rename me");
}

#[test]
fn test_copy_file() {
    let dir = temp_dir();
    let from = dir.path().join("src.txt");
    let to = dir.path().join("dst.txt");
    let from_str = from.to_string_lossy().to_string();
    let to_str = to.to_string_lossy().to_string();

    fs_ops::write_file(from_str.clone(), "copy me".into()).unwrap();
    fs_ops::copy_file(from_str.clone(), to_str.clone()).unwrap();

    assert_eq!(fs_ops::read_file(from_str).unwrap(), "copy me");
    assert_eq!(fs_ops::read_file(to_str).unwrap(), "copy me");
}

// ── presentation ────────────────────────────────────────────────

#[test]
fn test_get_presentation_dir() {
    let result = presentation::get_presentation_dir("/home/user/slides/test.html".into()).unwrap();
    assert_eq!(result, "/home/user/slides");
}

#[test]
fn test_get_presentation_dir_no_parent() {
    let result = presentation::get_presentation_dir("test.html".into()).unwrap();
    assert_eq!(result, "");
}

#[test]
fn test_check_style_css_exists() {
    let dir = temp_dir();
    let dir_str = dir.path().to_string_lossy().to_string();

    assert!(!presentation::check_style_css(dir_str.clone()).unwrap());

    fs_ops::write_file(dir.path().join("style.css").to_string_lossy().to_string(), "body{}".into()).unwrap();
    assert!(presentation::check_style_css(dir_str).unwrap());
}

// ── zip_ops (create real zip to test extraction) ────────────────

#[test]
fn test_extract_zip() {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    let dir = temp_dir();
    let zip_path = dir.path().join("test.zip");
    let dest_dir = dir.path().join("extracted");
    let dest_str = dest_dir.to_string_lossy().to_string();

    // Create a zip file
    {
        let zip_file = fs::File::create(&zip_path).unwrap();
        let mut writer = ZipWriter::new(zip_file);
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);

        writer.start_file("impress.md", options).unwrap();
        writer.write_all(b"---\n# Slide 1\n").unwrap();

        writer.start_file("style.css", options).unwrap();
        writer.write_all(b"body { background: red; }").unwrap();

        writer.start_file("subdir/nested.txt", options).unwrap();
        writer.write_all(b"nested content").unwrap();

        writer.finish().unwrap();
    }

    // Extract it
    fs::create_dir_all(&dest_dir).unwrap();
    let files = zip_ops::extract_zip(
        zip_path.to_string_lossy().to_string(),
        dest_str,
    ).unwrap();

    assert_eq!(files.len(), 3);
    assert!(files.iter().any(|f: &String| f.ends_with("impress.md")));
    assert!(files.iter().any(|f: &String| f.ends_with("style.css")));
    assert!(files.iter().any(|f: &String| f.ends_with("nested.txt")));

    // Verify extracted content
    let md_content = fs_ops::read_file(dest_dir.join("impress.md").to_string_lossy().to_string()).unwrap();
    assert_eq!(md_content, "---\n# Slide 1\n");
}

#[test]
fn test_extract_zip_invalid() {
    let result = zip_ops::extract_zip(
        "/nonexistent/file.zip".into(),
        "/tmp/dest".into(),
    );
    assert!(result.is_err());
}

// ── Exercise real example presentations ──────────────────────────

#[test]
fn test_read_example_html_presentations() {
    let examples_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("examples")
        .join("impress.js tests");

    let test_cases: Vec<(&str, bool)> = vec![
        ("2D-navigation/index.html", true),
        ("3D-positions/index.html", true),
        ("3D-rotations/index.html", true),
        ("classic-slides/index.html", true),
        ("cube/index.html", true),
        ("markdown/index.html", true),
    ];

    for (relative_path, should_exist) in test_cases {
        let path = examples_dir.join(relative_path);
        if should_exist {
            assert!(path.exists(), "Expected example to exist: {}", path.display());
            let content = fs_ops::read_file(path.to_string_lossy().to_string()).unwrap();
            assert!(content.len() > 100, "File {} seems too short ({} bytes)", relative_path, content.len());
            assert!(content.contains("impress"), "File {} doesn't contain 'impress'", relative_path);
        }
    }
}

#[test]
fn test_read_example_md_presentations() {
    let examples_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("examples");

    let md_files: Vec<&str> = vec![
        "Kaviár 2026-05-14/quiz.md",
        "turban 2026 Noc múzeí/quiz.md",
    ];

    for relative_path in md_files {
        let path = examples_dir.join(relative_path);
        assert!(path.exists(), "Expected MD example to exist: {}", path.display());
        let content = fs_ops::read_file(path.to_string_lossy().to_string()).unwrap();
        assert!(content.len() > 50, "File {} seems too short", relative_path);
        // MD files should have ----- slide separators or HTML content
        assert!(content.contains("-----") || content.contains("<div"),
            "File {} has no slide separators or HTML", relative_path);
    }
}

#[test]
fn test_example_style_css_detection() {
    let examples_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("examples");

    let dirs_with_style: Vec<&str> = vec![
        "Kaviár 2026-05-14",
        "turban 2026 Noc múzeí",
    ];

    for relative_dir in dirs_with_style {
        let path = examples_dir.join(relative_dir);
        let path_str = path.to_string_lossy().to_string();
        assert!(presentation::check_style_css(path_str.clone()).unwrap(),
            "Expected style.css in {}", path_str);
        let style = fs_ops::read_file(path.join("style.css").to_string_lossy().to_string()).unwrap();
        assert!(style.len() > 10, "style.css in {} is too short", path_str);
    }
}
