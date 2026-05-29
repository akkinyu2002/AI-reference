# Expense Tracker

A simple client-side expense tracker web app. Open `index.html` in a browser to run.

Project structure
- `index.html` — main entry
- `css/` — styles (`style.css`, `skin.css`)
- `js/` — application scripts (`app.js`, `storage.js`, `charts.js`, `utils.js`, `ai-engine.js`)
- `assets/icons/` — icon assets
- `tools/generate_icons.py` — helper script to (re)generate icons

How to use

- Open `index.html` in your preferred browser (no build step required).
- Add, edit, and remove expenses via the UI. Data is stored locally (see `js/storage.js`).

Development notes

- JavaScript files are in `js/`. Edit `app.js` for core app behavior and `storage.js` for persistence.
- To regenerate icons, run the Python script in `tools/` (requires Python and Pillow).

Contributing

- Feel free to open issues or suggest improvements. I can help expand documentation or add setup scripts.

License

Specify a license (e.g., MIT) or add a `LICENSE` file at the project root.
