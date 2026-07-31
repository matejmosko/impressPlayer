use crate::state::AppState;
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::thread;
use tauri::State;

fn mime_for(path: &str) -> &'static str {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    match ext.to_lowercase().as_str() {
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "ogg" | "ogv" => "video/ogg",
        "mov" => "video/quicktime",
        "avi" => "video/x-msvideo",
        "mkv" => "video/x-matroska",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "oga" => "audio/ogg",
        "opus" => "audio/opus",
        "flac" => "audio/flac",
        "aac" => "audio/aac",
        "m4a" => "audio/mp4",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "css" => "text/css",
        "js" => "application/javascript",
        "html" => "text/html",
        _ => "application/octet-stream",
    }
}

fn url_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                if let Ok(byte) = u8::from_str_radix(
                    std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or(""),
                    16,
                ) {
                    result.push(byte as char);
                    i += 3;
                    continue;
                }
                result.push(bytes[i] as char);
                i += 1;
            }
            b'+' => {
                result.push(' ');
                i += 1;
            }
            _ => {
                result.push(bytes[i] as char);
                i += 1;
            }
        }
    }
    result
}

fn handle_connection(mut stream: TcpStream, serve_dir: &Path, running: &Arc<std::sync::atomic::AtomicBool>) {
    if !running.load(std::sync::atomic::Ordering::Relaxed) {
        return;
    }

    let reader = stream.try_clone().ok();
    if reader.is_none() {
        return;
    }
    let mut buf_reader = BufReader::new(reader.unwrap());

    let mut request_line = String::new();
    if buf_reader.read_line(&mut request_line).is_err() {
        return;
    }

    let parts: Vec<&str> = request_line.trim().split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    let method = parts[0];
    let raw_path = parts[1];

    let decoded_path = url_decode(raw_path);
    let clean_path = decoded_path.trim_start_matches('/');

    let mut range_header: Option<String> = None;
    loop {
        let mut line = String::new();
        if buf_reader.read_line(&mut line).is_err() || line.trim().is_empty() {
            break;
        }
        let lower = line.to_lowercase();
        if lower.starts_with("range:") {
            range_header = Some(line.trim().to_string());
        }
    }

    let file_path = serve_dir.join(clean_path);

    if method == "HEAD" {
        if file_path.exists() && file_path.is_file() {
            let mime = mime_for(&decoded_path);
            let meta = std::fs::metadata(&file_path).ok();
            let len = meta.map(|m| m.len()).unwrap_or(0);
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\nConnection: close\r\n\r\n",
                mime, len
            );
            let _ = stream.write_all(resp.as_bytes());
        } else {
            let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(resp.as_bytes());
        }
        return;
    }

    if !file_path.exists() || !file_path.is_file() {
        let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    let mime = mime_for(&decoded_path);
    let file_size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);

    if let Some(range_str) = range_header {
        if let Some(range_val) = range_str.strip_prefix("Range: ") {
            let range_val = range_val.trim();
            if let Some(bytes_range) = range_val.strip_prefix("bytes=") {
                let parts: Vec<&str> = bytes_range.split('-').collect();
                if parts.len() == 2 {
                    let start: u64 = parts[0].parse().unwrap_or(0);
                    let end: u64 = if parts[1].is_empty() {
                        file_size - 1
                    } else {
                        parts[1].parse().unwrap_or(file_size - 1)
                    };

                    if start >= file_size || start > end {
                        let resp = "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(resp.as_bytes());
                        return;
                    }

                    let actual_end = end.min(file_size - 1);
                    let content_length = actual_end - start + 1;

                    let resp = format!(
                        "HTTP/1.1 206 Partial Content\r\nContent-Type: {}\r\nContent-Length: {}\r\nContent-Range: bytes {}-{}/{}\r\nAccept-Ranges: bytes\r\nConnection: close\r\n\r\n",
                        mime, content_length, start, actual_end, file_size
                    );
                    let _ = stream.write_all(resp.as_bytes());

                    if let Ok(mut file) = File::open(&file_path) {
                        let _ = file.seek(SeekFrom::Start(start));
                        let mut buf = [0u8; 64 * 1024];
                        let mut remaining = content_length;
                        while remaining > 0 {
                            let to_read = remaining.min(buf.len() as u64) as usize;
                            match file.read(&mut buf[..to_read]) {
                                Ok(0) => break,
                                Ok(n) => {
                                    if stream.write_all(&buf[..n]).is_err() {
                                        break;
                                    }
                                    remaining -= n as u64;
                                }
                                Err(_) => break,
                            }
                        }
                    }
                    return;
                }
            }
        }
    }

    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\nConnection: close\r\n\r\n",
        mime, file_size
    );
    let _ = stream.write_all(resp.as_bytes());

    if let Ok(mut file) = File::open(&file_path) {
        let mut buf = [0u8; 64 * 1024];
        loop {
            match file.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if stream.write_all(&buf[..n]).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    }
}

pub struct MediaServerHandle {
    pub port: u16,
    pub serve_dir: PathBuf,
    running: Arc<std::sync::atomic::AtomicBool>,
}

impl Drop for MediaServerHandle {
    fn drop(&mut self) {
        self.running
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn start_media_server(dir: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut server_lock = state.media_server.lock().map_err(|e| e.to_string())?;
    *server_lock = None;
    let handle = start_media_server_inner(dir)?;
    let url = format!("http://127.0.0.1:{}", handle.port);
    *server_lock = Some(handle);
    Ok(url)
}

#[tauri::command]
pub fn stop_media_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut server_lock = state.media_server.lock().map_err(|e| e.to_string())?;
    *server_lock = None;
    Ok(())
}

fn start_media_server_inner(dir: String) -> Result<MediaServerHandle, String> {
    let serve_dir = PathBuf::from(&dir);
    if !serve_dir.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let running = Arc::new(std::sync::atomic::AtomicBool::new(true));

    let handle = MediaServerHandle {
        port,
        serve_dir: serve_dir.clone(),
        running: running.clone(),
    };

    let server_running = running.clone();
    thread::spawn(move || {
        listener.set_nonblocking(true).ok();
        while server_running.load(std::sync::atomic::Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _)) => {
                    handle_connection(stream, &serve_dir, &server_running);
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
                Err(_) => {
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
            }
        }
    });

    Ok(handle)
}
