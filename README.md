# 🐍 Nissan GT-R Legacy Tribute | Fan-Made Scroll Experience

A premium, interactive, scroll-driven web tribute to the legendary **Nissan GT-R** lineage—from the motorsport-dominating R32 "Godzilla" to the modern R35 supercar killer.

<div align="center">
  <img src="images/gt-r-badge.svg" alt="GT-R Badge" width="200" style="margin: 20px 0;"/>
</div>

---

## 🚗 About the Project

**Project GTR** is an interactive visual experience built to honor the legacy of the Nissan GT-R. Using scroll-driven animations, high-fidelity responsive layouts, and embedded interactive 3D Sketchfab models, the site takes users on a chronological journey through four generations of automotive history.

---

## 🌟 Key Features

- **🚥 Immersive Preloader**: Clean startup loading state that displays twin-turbo priming animations and pre-loads resource assets.
- **🏎️ Chronological Generation Pages**: Detail-rich sections focusing on the R32, R33, R34, and R35 GT-R models, each with dedicated performance stats.
- **📦 Interactive 3D Models**: Embedded, interactive 3D CAD render views of each generation powered by Sketchfab embeds.
- **📱 Responsive Layouts**: Fully responsive grid and split-screen layouts optimized for desktop, tablet, and mobile screens.
- **🎥 Generation Evolution Timeline**: A detailed timeline tracking the evolution from 1989 to the R35's production retirement in 2025, accompanied by dynamic media/video segments.

---

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5
- **Styling**: Modern, responsive CSS3 using Google Fonts (`Orbitron`, `Barlow Condensed`, `Inter Tight`)
- **Interactions**: Vanilla JavaScript to handle loading, animations, and interactive scroll events
- **3D Viewer Integration**: Sketchfab Viewer API integration

---

## 📁 Repository Structure

```directory
Project GTR/
├── css/
│   └── styles.css          # Styling, dark mode, animations & typography
├── images/
│   ├── gt-r-badge.svg      # SVG graphics and logos
│   ├── *.jpg               # Image assets of Skyline generations
│   └── edit.mp4            # Evolution video reel
├── js/
│   └── main.js             # Loading screen logic & scroll animations
├── index.html              # Main webpage container
└── README.md               # Repository documentation
```

---

## 🚀 Running the Project Locally

The project can be run directly in any modern web browser.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vibhorsxni/Project-GTR.git
   cd Project-GTR
   ```
2. **Open in browser**:
   Simply open the `index.html` file in your favorite browser, or serve it using a lightweight local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (npx)
   npx serve .
   ```
3. Visit `http://localhost:8000` (or the port specified by your local server) to experience the tribute.

---

## 🤝 Credits

- **Design**: Created by `gfxthecars` / `vibhorsxni`.
- **3D Models**: 
  - Nissan Skyline R32 GT-R by [Lexyc16](https://sketchfab.com/3d-models/nissan-skyline-r32-gt-r-8810e677eca543a6b840cf67dd064aa4)
  - 1997 Nissan Skyline GT-R R33 by [DisneyCars](https://sketchfab.com/3d-models/1997-nissan-skyline-gt-r-r33-d80ea5ec62ed433483fc62f55d14e410)
  - Nissan Skyline R34 GT-R by [Lexyc16](https://sketchfab.com/3d-models/nissan-skyline-r34-gt-r-ff8fb2251dfa4bb9979e7022c5a6666c)
  - Nissan GT-R R35 by [Ciasny](https://sketchfab.com/3d-models/nissan-gtr-r35-51c912a8310c4e00a82ad7673d84228a)

---

<div align="center">
  <h3>Made with ❤️ for the automotive community by Vibx</h3>
</div>
