import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Google Fonts
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
document.head.appendChild(link);

// Add Material Icons
const materialIcons = document.createElement("link");
materialIcons.rel = "stylesheet";
materialIcons.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
document.head.appendChild(materialIcons);

// Add page title
const title = document.createElement("title");
title.textContent = "🍀三重分隊 協勤/退勤/救護記錄系統";
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(<App />);
