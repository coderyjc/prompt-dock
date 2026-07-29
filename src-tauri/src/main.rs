#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
fn copy_prompt(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|error| error.to_string())?;
    clipboard.set_text(text).map_err(|error| error.to_string())
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

fn show_window(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("{label} window not found"))?;
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

fn show_edit_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("edit")
        .ok_or_else(|| "edit window not found".to_string())?;
    let _ = window.unminimize();
    let _ = window.center();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

fn toggle_edit_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("edit")
        .ok_or_else(|| "edit window not found".to_string())?;

    if window.is_visible().map_err(|error| error.to_string())? {
        window.hide().map_err(|error| error.to_string())
    } else {
        let _ = window.center();
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())
    }
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open_edit = MenuItem::with_id(app, "open_edit", "打开编辑窗口", true, None::<&str>)?;
    let open_manage = MenuItem::with_id(app, "open_manage", "打开管理窗口", true, None::<&str>)?;
    let pause_shortcuts = MenuItem::with_id(app, "pause_shortcuts", "暂停快捷键", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_edit, &open_manage, &pause_shortcuts, &quit])?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Prompt Dock")
        .icon_as_template(false)
        .show_menu_on_left_click(true)
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
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_window(app, "manage");
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    let toggle_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyL);
                    if shortcut == &toggle_shortcut && event.state() == ShortcutState::Pressed {
                        let _ = toggle_edit_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            build_tray(app)?;
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyL);
            app.global_shortcut().register(shortcut)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            copy_prompt,
            submit_prompt,
            open_manage_window,
            open_edit_window,
            hide_edit_window
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
