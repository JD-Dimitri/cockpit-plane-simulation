//! Coquille native de l'application. Phase 1 : aucune commande native exposée.
//! Le moteur de simulation tourne dans le WebView (Web Worker) ; le Rust ne servira
//! que pour le matériel (HID, série) et les fichiers, avec des permissions minimales.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("échec du lancement de l'application");
}
