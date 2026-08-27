# Software Usability Testing Recorder

A simple, lightweight, and fully functional web application feedback portal used to record software usability testing scenarios, log UX issues with severity levels, and track UI design adjustments.

---

## 🚀 Features & User Roles

### 1. **Admin**
- View dashboard with overview metrics & statistics
- Add, view, and delete software projects
- View all test scenarios, UX issues, and UI design adjustments

### 2. **Tester**
- Log in with dedicated credentials
- Record usability testing scenarios (Project, Task Description, Pass/Fail Result, Notes)
- Report UX issues with severity levels (`Low`, `Medium`, `High`)
- Monitor open/resolved issues

### 3. **Designer / Developer**
- Log in with dedicated credentials
- View reported UX issues
- Add UI design adjustment details
- Change issue status and mark issues as **Fixed**

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla CSS), JavaScript (Vanilla ES6)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (`database/database.db` automatically initialized)
- **Deployment**: Render ready (single Express web service)

---

## 📂 Project Structure

```text
Software-Usability-Testing-Recorder/
│
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── projects.html
│   ├── scenarios.html
│   ├── issues.html
│   ├── adjustments.html
│   ├── style.css
│   └── script.js
│
├── database/
│   └── database.db (auto-created on startup)
│
├── server.js
├── package.json
├── .gitignore
└── README.md
```

---

## 🔑 Default Demo Login Credentials

The application automatically seeds the SQLite database with default users upon initial backend launch:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Tester** | `tester` | `tester123` |
| **Designer / Developer** | `designer` | `designer123` |

---

## 💻 Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd Software-Usability-Testing-Recorder
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   Open your browser and navigate to: `http://localhost:3000`

---

## 🌐 Deploying to Render

This repository is optimized to deploy directly as a single **Web Service** on Render:

1. Push your code to a **GitHub** repository.
2. Log in to [Render](https://render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following options:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.

Render will automatically bind to `process.env.PORT` and serve the web application.
