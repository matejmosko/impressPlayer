use crate::commands::media_server::serve_file_request;
use crate::state::AppState;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::State;

const WAITING_PAGE: &str = r#"<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="1">
<title>impressPlayer Projector</title>
<style>
  html, body { margin: 0; height: 100%; display: flex; align-items: center; justify-content: center;
               background: #2d2d2d; color: #999; font-family: sans-serif; }
</style>
</head>
<body>
  <div>
    <h1>impressPlayer Projector</h1>
    <p>Waiting for a presentation to be loaded...</p>
  </div>
</body>
</html>"#;

#[derive(Default)]
pub struct SharedProjectorState {
    pub serve_dir: PathBuf,
    pub page_html: Option<String>,
    pub slide: String,
    pub time: f64,
    pub playing: bool,
    pub rev: u64,
}

pub struct ProjectorServerHandle {
    pub port: u16,
    running: Arc<AtomicBool>,
    shared: Arc<Mutex<SharedProjectorState>>,
}

impl Drop for ProjectorServerHandle {
    fn drop(&mut self) {
        self.running
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }
}

fn lan_ip() -> String {
    use std::net::UdpSocket;
    if let Ok(sock) = UdpSocket::bind("0.0.0.0:0") {
        if sock.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = sock.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

fn http_response(stream: &mut TcpStream, status: &str, content_type: &str, body: &[u8]) {
    let head = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        status,
        content_type,
        body.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(body);
}

fn state_json(shared: &SharedProjectorState) -> String {
    serde_json::json!({
        "slide": shared.slide,
        "rev": shared.rev,
        "media": {
            "time": shared.time,
            "playing": shared.playing,
        }
    })
    .to_string()
}

fn handle_connection(
    mut stream: TcpStream,
    shared: &Arc<Mutex<SharedProjectorState>>,
) {
    let reader = match stream.try_clone() {
        Ok(r) => r,
        Err(_) => return,
    };
    let mut buf_reader = BufReader::new(reader);

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

    let mut range_header: Option<String> = None;
    loop {
        let mut line = String::new();
        if buf_reader.read_line(&mut line).is_err() || line.trim().is_empty() {
            break;
        }
        let lower = line.to_lowercase();
        if lower.starts_with("range:") {
            if let Some(idx) = line.find(':') {
                range_header = Some(format!("Range: {}", line[idx + 1..].trim()));
            }
        }
    }

    let path = raw_path.split('?').next().unwrap_or(raw_path);
    let decoded_path = percent_decode(path);

    if method == "GET" || method == "HEAD" {
        if decoded_path == "/" || decoded_path == "/projector" || decoded_path == "/projector/" {
            let (page, rev) = {
                let guard = match shared.lock() {
                    Ok(g) => g,
                    Err(_) => return,
                };
                (
                    guard.page_html.clone().unwrap_or_else(|| WAITING_PAGE.to_string()),
                    guard.rev,
                )
            };
            let page = page.replace(
                "/*__PROJECTOR_REV__*/",
                &format!("projectorRev = {};", rev),
            );
            if method == "HEAD" {
                let _ = stream.write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
                        page.len()
                    )
                    .as_bytes(),
                );
            } else {
                http_response(&mut stream, "200 OK", "text/html; charset=UTF-8", page.as_bytes());
            }
            return;
        }
        if decoded_path == "/state" {
            let body = match shared.lock() {
                Ok(g) => state_json(&g),
                Err(_) => return,
            };
            if method == "HEAD" {
                let _ = stream.write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
                        body.len()
                    )
                    .as_bytes(),
                );
            } else {
                http_response(
                    &mut stream,
                    "200 OK",
                    "application/json",
                    body.as_bytes(),
                );
            }
            return;
        }
        if let Some(media_path) = decoded_path.strip_prefix("/media/") {
            let clean = media_path.trim_start_matches('/');
            let serve_dir = {
                let guard = match shared.lock() {
                    Ok(g) => g,
                    Err(_) => return,
                };
                guard.serve_dir.clone()
            };
            serve_file_request(&mut stream, &serve_dir, method, clean, range_header.as_deref());
            return;
        }
    }

    let _ = stream.write_all(
        "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".as_bytes(),
    );
}

fn percent_decode(s: &str) -> String {
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
            _ => {
                result.push(bytes[i] as char);
                i += 1;
            }
        }
    }
    result
}

#[tauri::command]
pub fn start_projector_server(dir: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut server_lock = state
        .projector_server
        .lock()
        .map_err(|e| e.to_string())?;
    if let Some(handle) = server_lock.as_ref() {
        return Ok(format!("http://{}:{}/", lan_ip(), handle.port));
    }
    let handle = start_projector_server_inner(dir)?;
    let url = format!("http://{}:{}/", lan_ip(), handle.port);
    *server_lock = Some(handle);
    Ok(url)
}

#[tauri::command]
pub fn stop_projector_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut server_lock = state
        .projector_server
        .lock()
        .map_err(|e| e.to_string())?;
    *server_lock = None;
    Ok(())
}

#[tauri::command]
pub fn set_projector_page(html: String, dir: String, state: State<'_, AppState>) -> Result<(), String> {
    let server_lock = state
        .projector_server
        .lock()
        .map_err(|e| e.to_string())?;
    if let Some(handle) = server_lock.as_ref() {
        let mut guard = handle.shared.lock().map_err(|e| e.to_string())?;
        guard.page_html = Some(html);
        guard.serve_dir = PathBuf::from(&dir);
        guard.rev += 1;
    }
    Ok(())
}

#[tauri::command]
pub fn update_projection_state(
    slide: String,
    time: Option<f64>,
    playing: Option<bool>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let server_lock = state
        .projector_server
        .lock()
        .map_err(|e| e.to_string())?;
    if let Some(handle) = server_lock.as_ref() {
        let mut guard = handle.shared.lock().map_err(|e| e.to_string())?;
        guard.slide = slide;
        if let Some(t) = time {
            guard.time = t;
        }
        if let Some(p) = playing {
            guard.playing = p;
        }
    }
    Ok(())
}

fn start_projector_server_inner(dir: String) -> Result<ProjectorServerHandle, String> {
    let serve_dir = PathBuf::from(&dir);
    if !serve_dir.is_dir() {
        return Err(format!("Not a directory: {}", dir));
    }

    let listener =
        TcpListener::bind("0.0.0.0:0").map_err(|e| format!("Failed to bind: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let running = Arc::new(AtomicBool::new(true));
    let shared = Arc::new(Mutex::new(SharedProjectorState {
        serve_dir: serve_dir.clone(),
        page_html: None,
        slide: String::new(),
        time: 0.0,
        playing: false,
        rev: 0,
    }));

    let handle = ProjectorServerHandle {
        port,
        running: running.clone(),
        shared: shared.clone(),
    };

    let server_running = running.clone();
    thread::spawn(move || {
        listener.set_nonblocking(true).ok();
        while server_running.load(std::sync::atomic::Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _)) => {
                    let shared = shared.clone();
                    thread::spawn(move || handle_connection(stream, &shared));
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_decode_handles_encoding() {
        assert_eq!(percent_decode("/media/video%20intro.mp4"), "/media/video intro.mp4");
        assert_eq!(percent_decode("/media/plain.mp4"), "/media/plain.mp4");
    }

    #[test]
    fn state_json_shape() {
        let mut shared = SharedProjectorState::default();
        shared.slide = "step-3".to_string();
        shared.time = 12.5;
        shared.playing = true;
        shared.rev = 2;
        let json = state_json(&shared);
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["slide"], "step-3");
        assert_eq!(v["rev"], 2);
        assert_eq!(v["media"]["time"], 12.5);
        assert_eq!(v["media"]["playing"], true);
    }

    fn http_get(addr: &str, path: &str) -> (String, Vec<u8>) {
        use std::io::{Read, Write};
        use std::net::TcpStream;
        let mut stream = TcpStream::connect(addr).unwrap();
        stream
            .write_all(
                format!(
                    "GET {} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
                    path
                )
                .as_bytes(),
            )
            .unwrap();
        let mut buf = Vec::new();
        stream.read_to_end(&mut buf).unwrap();
        let text = String::from_utf8_lossy(&buf);
        if let Some(idx) = text.find("\r\n\r\n") {
            (text[..idx].to_string(), buf[idx + 4..].to_vec())
        } else {
            (text.to_string(), Vec::new())
        }
    }

    #[test]
    fn server_serves_page_state_and_media() {
        let dir = std::env::temp_dir().join("impressproj_test");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("v.mp4"), b"hello-media").unwrap();

        let handle = start_projector_server_inner(dir.to_str().unwrap().to_string()).unwrap();
        let addr = format!("127.0.0.1:{}", handle.port);

        {
            let mut guard = handle.shared.lock().unwrap();
            guard.page_html = Some(
                "<!DOCTYPE html><html><body>proj<script>var projectorRev = 0; /*__PROJECTOR_REV__*/</script></body></html>".to_string(),
            );
            guard.rev = 3;
            guard.slide = "step-2".to_string();
            guard.time = 5.0;
            guard.playing = true;
        }

        let (head, body) = http_get(&addr, "/");
        assert!(head.starts_with("HTTP/1.1 200"));
        assert!(head.contains("text/html"));
        let body = String::from_utf8(body).unwrap();
        assert!(body.contains("proj"));
        assert!(body.contains("projectorRev = 3;"), "rev must be injected into page");

        let (head, body) = http_get(&addr, "/state");
        assert!(head.starts_with("HTTP/1.1 200"));
        assert!(head.contains("application/json"));
        let v: serde_json::Value = serde_json::from_str(&String::from_utf8(body).unwrap()).unwrap();
        assert_eq!(v["slide"], "step-2");
        assert_eq!(v["rev"], 3);
        assert_eq!(v["media"]["time"], 5.0);
        assert_eq!(v["media"]["playing"], true);

        let (head, body) = http_get(&addr, "/media/v.mp4");
        assert!(head.starts_with("HTTP/1.1 200"));
        assert_eq!(String::from_utf8(body).unwrap(), "hello-media");

        let (head, _) = http_get(&addr, "/nope");
        assert!(head.starts_with("HTTP/1.1 404"));

        drop(handle);
        std::fs::remove_dir_all(&dir).ok();
    }
}
