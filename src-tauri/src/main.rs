#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{process::Command, str::FromStr, sync::Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, LogicalSize, Manager, Size, State, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

struct ToggleShortcutState(Mutex<Shortcut>);
struct EditWindowSizeState(Mutex<(u32, u32)>);

fn default_toggle_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL), Code::KeyL)
}

fn default_edit_window_size() -> (u32, u32) {
    (760, 520)
}

fn clamp_edit_window_size(width: u32, height: u32) -> (u32, u32) {
    (width.clamp(520, 1600), height.clamp(360, 1000))
}

fn apply_edit_window_size(window: &WebviewWindow, width: u32, height: u32) -> Result<(), String> {
    let (width, height) = clamp_edit_window_size(width, height);
    let _ = window.set_min_size(Some(Size::Logical(LogicalSize::new(520.0, 360.0))));
    window
        .set_size(Size::Logical(LogicalSize::new(width as f64, height as f64)))
        .map_err(|error| error.to_string())
}

fn restore_edit_window_size(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let (width, height) = *app
        .state::<EditWindowSizeState>()
        .0
        .lock()
        .map_err(|_| "edit window size state is unavailable".to_string())?;
    apply_edit_window_size(window, width, height)
}

#[tauri::command]
fn copy_prompt(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|error| error.to_string())?;
    clipboard.set_text(text).map_err(|error| error.to_string())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("unsupported url scheme".to_string());
    }

    Command::new("explorer")
        .arg(url)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn submit_prompt(text: String) -> Result<(), String> {
    copy_prompt(text)
}

#[tauri::command]
fn open_manage_window(app: AppHandle) -> Result<(), String> {
    show_window(&app, "manage")
}

#[tauri::command]
fn open_edit_window(app: AppHandle) -> Result<(), String> {
    show_edit_window(&app)
}

#[tauri::command]
fn hide_edit_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("edit")
        .ok_or_else(|| "edit window not found".to_string())?;
    window.hide().map_err(|error| error.to_string())
}

#[tauri::command]
fn hide_manage_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("manage")
        .ok_or_else(|| "manage window not found".to_string())?;
    window.hide().map_err(|error| error.to_string())
}

#[tauri::command]
fn set_global_toggle_shortcut(
    app: AppHandle,
    state: State<ToggleShortcutState>,
    keys: String,
) -> Result<(), String> {
    let normalized_keys = keys.replace("Win", "Super");
    let next = Shortcut::from_str(&normalized_keys).map_err(|error| error.to_string())?;
    let mut current = state
        .0
        .lock()
        .map_err(|_| "shortcut state is unavailable".to_string())?;

    if *current == next {
        return Ok(());
    }

    let previous = *current;
    let _ = app.global_shortcut().unregister(previous);

    if let Err(error) = app.global_shortcut().register(next) {
        let _ = app.global_shortcut().register(previous);
        return Err(error.to_string());
    }

    *current = next;
    Ok(())
}

#[tauri::command]
fn set_edit_window_size(
    app: AppHandle,
    size_state: State<EditWindowSizeState>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let window = app
        .get_webview_window("edit")
        .ok_or_else(|| "edit window not found".to_string())?;
    let (width, height) = clamp_edit_window_size(width, height);
    {
        let mut current = size_state
            .0
            .lock()
            .map_err(|_| "edit window size state is unavailable".to_string())?;
        *current = (width, height);
    }
    apply_edit_window_size(&window, width, height)
}

fn show_window(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("{label} window not found"))?;
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

fn show_edit_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("edit")
        .ok_or_else(|| "edit window not found".to_string())?;
    let _ = window.unminimize();
    let _ = restore_edit_window_size(app, &window);
    let _ = window.center();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

fn toggle_edit_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("edit")
        .ok_or_else(|| "edit window not found".to_string())?;

    if window.is_visible().map_err(|error| error.to_string())? {
        window.hide().map_err(|error| error.to_string())?;
        Ok(())
    } else {
        let _ = restore_edit_window_size(app, &window);
        let _ = window.center();
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        Ok(())
    }
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open_edit = MenuItem::with_id(app, "open_edit", "打开编辑窗口", true, None::<&str>)?;
    let open_manage = MenuItem::with_id(app, "open_manage", "打开工作台", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出 Prompt Dock", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_edit, &open_manage, &separator, &quit])?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Prompt Dock - 双击打开编辑窗口")
        .icon_as_template(false)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open_edit" => {
                let _ = show_edit_window(app);
            }
            "open_manage" => {
                let _ = show_window(app, "manage");
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                let _ = show_edit_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(ToggleShortcutState(Mutex::new(default_toggle_shortcut())))
        .manage(EditWindowSizeState(Mutex::new(default_edit_window_size())))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_window(app, "manage");
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    let is_toggle = app
                        .state::<ToggleShortcutState>()
                        .0
                        .lock()
                        .map(|registered| *shortcut == *registered)
                        .unwrap_or(false);

                    if is_toggle && event.state() == ShortcutState::Pressed {
                        let _ = toggle_edit_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            build_tray(app)?;
            app.global_shortcut().register(default_toggle_shortcut())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            copy_prompt,
            open_external_url,
            submit_prompt,
            open_manage_window,
            open_edit_window,
            hide_manage_window,
            hide_edit_window,
            set_edit_window_size,
            set_global_toggle_shortcut
        ])
        .on_window_event(|window, event| {
            if window.label() == "manage" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Prompt Dock");
}
