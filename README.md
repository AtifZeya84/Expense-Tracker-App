<div align="center">

# 💸 SpendLog — Expense Tracker

### A full-stack expense tracking web app to manage your daily spending, visualize financial habits, and stay on budget.

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-spend--log.netlify.app-3dd68c?style=for-the-badge)](https://spend-log.netlify.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![Frontend](https://img.shields.io/badge/Frontend-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://spend-log.netlify.app/)

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=flat-square&logo=bootstrap&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)

</div>

---

## 🖥️ Live Demo

> **👉 [https://spend-log.netlify.app/](https://spend-log.netlify.app/)**

Frontend hosted on **Netlify** · Backend REST API hosted on **Render** · Database on **Render PostgreSQL**

---

## ✨ Features

### 📊 Dashboard
- **Total Spent** card with month-over-month comparison
- **Avg / Day** spending calculation
- **Top Category** with amount spent
- **Budget Used** progress indicator
- **Spending Trend** line chart — toggle between 7D, 30D, 90D views
- **By Category** donut chart with percentage breakdown
- **Recent Expenses** quick view with "View All" link

### 🧾 Expenses
- Add, Edit, Delete expenses with instant UI update
- **Undo delete** — 4-second window to recover a deleted expense
- Filter by category — Food, Transport, Shopping, Health, Entertainment, Other
- Sort by Newest, Oldest, Highest Amount, Lowest Amount
- **Search** expenses by title, note, or category
- **Export to CSV** — download all expenses as a spreadsheet

### 📈 Analytics
- **Monthly Breakdown** stacked bar chart — last 6 months by category
- **Category Split** donut chart — full spending breakdown
- **Category Totals** with progress bars showing relative spend

### 💰 Budget
- Set a monthly spending limit **per category**
- Visual progress bar turns **yellow at 75%**, **red at 100%**
- Status messages: "Getting close", "Over by ₹X"
- Budget persists across sessions via `localStorage`

### 🌙 UI/UX
- Dark / Light mode toggle
- Fully responsive — works on mobile, tablet, and desktop
- Smooth animations and transitions
- Clean monospace font for financial data (DM Mono)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language** | Java 17 |
| **Backend Framework** | Spring Boot 3.2 |
| **Database** | PostgreSQL |
| **ORM** | Spring Data JPA / Hibernate |
| **API Style** | RESTful API |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6) |
| **CSS Framework** | Bootstrap 5.3 |
| **Charts** | Chart.js 4.4 |
| **Icons** | Bootstrap Icons 1.11 |
| **Fonts** | Syne, DM Mono (Google Fonts) |
| **Backend Hosting** | Render |
| **Frontend Hosting** | Netlify |
| **DB Hosting** | Render PostgreSQL |

---

## 📁 Project Structure

```
Expense-Tracker-App/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/expensetracker/
│       │   ├── ExpenseTrackerApplication.java
│       │   ├── controller/
│       │   │   └── ExpenseController.java     # REST endpoints
│       │   ├── model/
│       │   │   └── Expense.java               # JPA Entity
│       │   ├── repository/
│       │   │   └── ExpenseRepository.java     # Spring Data JPA
│       │   └── service/
│       │       └── ExpenseService.java        # Business logic
│       └── resources/
│           └── application.properties         # DB config
└── frontend/
    ├── index.html                             # Single page app
    ├── style.css                              # Custom styles + Bootstrap overrides
    └── app.js                                 # All JS logic (CRUD, charts, budget)
```

---

## 🔌 REST API Endpoints

Base URL: `https://your-backend.onrender.com/api/expenses`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | Get all expenses |
| `GET` | `/api/expenses/{id}` | Get expense by ID |
| `GET` | `/api/expenses/category/{category}` | Filter by category |
| `GET` | `/api/expenses/total` | Get total amount spent |
| `POST` | `/api/expenses` | Create a new expense |
| `PUT` | `/api/expenses/{id}` | Update an expense |
| `DELETE` | `/api/expenses/{id}` | Delete an expense |

### Example Request Body (POST / PUT)

```json
{
  "title": "Lunch",
  "amount": 250.00,
  "category": "Food",
  "date": "2026-04-29",
  "note": "Ate at Café Coffee Day"
}
```

---

## ⚙️ Local Setup

### Prerequisites
- Java 17+
- Maven
- PostgreSQL

### 1. Clone the repository
```bash
git clone https://github.com/AtifZeya84/Expense-Tracker-App.git
cd Expense-Tracker-App
```

### 2. Set up the database
```sql
CREATE DATABASE expensedb;
```

### 3. Configure application.properties
```properties
# backend/src/main/resources/application.properties
spring.datasource.url=jdbc:postgresql://localhost:5432/expensedb
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

### 4. Run the backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs at: `http://localhost:8080`

### 5. Run the frontend
Open `frontend/index.html` with **VS Code Live Server** or any local server.

> Make sure `API_URL` in `app.js` points to `http://localhost:8080/api/expenses` for local dev.

---

## 🚀 Deployment

### Backend → Render
1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set build command: `mvn clean package -DskipTests`
5. Set start command: `java -jar target/expense-tracker-0.0.1-SNAPSHOT.jar`
6. Add environment variables for DB credentials
7. Create a free PostgreSQL database on Render and link it

### Frontend → Netlify
1. Update `API_URL` in `app.js` to your Render backend URL
2. Drag and drop the `frontend/` folder on [netlify.com](https://netlify.com)

---

## 📌 What I Learned

- Building a **REST API** with Spring Boot and Spring Data JPA
- Connecting a **Java backend to PostgreSQL** using Hibernate ORM
- Designing a **responsive single-page UI** without React/Angular
- Integrating **Chart.js** for interactive data visualization
- Deploying a **full-stack app** on cloud platforms (Render + Netlify)
- Managing **CORS** between separate frontend and backend deployments

---

## 🔮 Future Improvements

- [ ] User authentication (Spring Security + JWT)
- [ ] Multiple user support
- [ ] Email/SMS budget alerts
- [ ] Recurring expense tracking
- [ ] Mobile app (React Native)

---

## 👨‍💻 Author

**Atif Zeya**
Full Stack Developer | Java • Spring Boot | Open to opportunities

[![GitHub](https://img.shields.io/badge/GitHub-AtifZeya84-181717?style=flat-square&logo=github)](https://github.com/AtifZeya84)

---

<div align="center">
  If you found this project helpful, please consider giving it a ⭐
</div>
