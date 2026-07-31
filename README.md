# Abirham Demilew — Portfolio

A modern, responsive personal portfolio built with vanilla HTML, CSS, and JavaScript. It showcases my work as a Full Stack Developer specializing in the **MERN stack** (MongoDB, Express.js, React, Node.js).

🔗 **Live site:** [my-portfolio-5amg.onrender.com](https://my-portfolio-5amg.onrender.com)

---

## Features

- 🎨 Green-branded, fully **dark mode** compatible design
- ✨ Smooth scroll animations, 3D card tilts, and an animated rotating tech cube
- ⌨️ Typing-effect hero roles and animated skill bars
- 🗂️ Filterable project gallery with live demo & GitHub links
- 📝 **EmailJS** powered contact form with offline fallback (saved locally)
- 📊 Built-in **analytics engine** (localStorage) — visitors, page views, project clicks, section dwell time, traffic sources
- 🔐 **Admin panel** (`admin.html`) — analytics dashboard, contact messages inbox, project manager, and settings

## Tech Stack

| Layer      | Technologies                                       |
| ---------- | -------------------------------------------------- |
| Frontend   | HTML5, CSS3, JavaScript (ES6+)                     |
| Backend    | Node.js, Express.js (project examples)             |
| Database   | MongoDB                                            |
| Tooling    | Git, GitHub, Render, Vercel                        |
| Services   | EmailJS, localStorage analytics                    |

## Project Structure

```
My-portfolio/
├── index.html        # Main portfolio page
├── styles.css        # Portfolio styles + theming
├── script.js         # UI interactions (theme, menu, filters, form)
├── analytics.js      # Visitor analytics engine
├── admin.html        # Admin panel
├── admin.css         # Admin panel styles
├── admin.js          # Admin logic (auth, analytics, messages, projects)
├── profile.jpg       # Profile photo
├── campuspc.jpg      # Campus PC project preview
├── Abirsh CV.pdf     # Downloadable CV
└── README.md
```

## Getting Started

This is a static site — no build step required.

```bash
# Clone the repository
git clone https://github.com/Abirshdev/My-portfolio.git

# Serve locally (any static server works)
cd My-portfolio/abirham2
python -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000` in your browser.

> The contact form uses **EmailJS**. To make it work with your own account, update the public key, service ID, and template ID in `script.js`.

## Featured Projects

| Project | Stack | Links |
| ------- | ----- | ----- |
| **Smart Hospital Queue Management** | MongoDB, Express, React, Node.js, Socket.IO | [Live](https://shqms.vercel.app) · [GitHub](https://github.com/Abirshdev/SHQMS) |
| **Campus PC Entry & Exit Monitoring** | MongoDB, Express, Node.js | [Live](https://campuspcsystem.onrender.com) · [GitHub](https://github.com/Abirshdev/CampusPCSystem) |
| **Smart Grocery** | React, Node.js, MongoDB | [Live](https://smart-grocery-phi.vercel.app/) · [GitHub](https://github.com/Abirshdev/SmartGrocery) |

## Admin Panel

Visit `admin.html` to access the dashboard.

- **Default credentials:** `admin` / `admin123` (Super Admin)
- Manage analytics (incl. **Sections Viewed** and **Visitor Journeys**), read contact messages, add/edit/delete projects, change branding (profile photo & favicon), and manage accounts from the **Users** tab.

### Roles

| Role         | Access                                                   |
| ------------ | -------------------------------------------------------- |
| Super Admin  | Everything, including user management                    |
| Admin        | Everything except user management                        |
| Viewer       | Read-only analytics & messages                           |

> ⚠️ Change the default password after your first login and use the **Users** tab to add your team. Analytics data is stored per-browser in `localStorage`.

## Contact

- **Email:** [abirhamdemilew@gmail.com](mailto:abirhamdemilew@gmail.com)
- **GitHub:** [Abirshdev](https://github.com/Abirshdev)
- **LinkedIn:** [Abirham Demilew](https://www.linkedin.com/in/abirham-demilew-68b690388)
- **Telegram:** [@Abi2013](https://t.me/Abi2013)
