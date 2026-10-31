// Empêche l'ouverture d'une console supplémentaire sous Windows en version publiée.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    a350_simulator_lib::run()
}
