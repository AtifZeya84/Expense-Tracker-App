# 💸 Expense Tracker — Full Stack Project

A full-stack Expense Tracker built with **Spring Boot**, **PostgreSQL**, and vanilla **HTML/CSS/JS**.
Perfect for your resume and live portfolio!

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/expensetracker/
│       ├── ExpenseTrackerApplication.java
│       ├── model/Expense.java
│       ├── repository/ExpenseRepository.java
│       ├── service/ExpenseService.java
│       └── controller/ExpenseController.java
│   └── src/main/resources/
│       └── application.properties
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## ⚙️ Backend Setup (Spring Boot)

### Prerequisites
- Java 17+
- Maven
- PostgreSQL installed and running

### Step 1 — Create the Database
Open pgAdmin or psql and run:
```sql
CREATE DATABASE expensedb;
```

### Step 2 — Update application.properties
Open `backend/src/main/resources/application.properties` and update:
```
spring.datasource.password=your_actual_password
```

### Step 3 — Run the Backend
```bash
cd backend
mvn spring-boot:run
```

Your API is now running at: `http://localhost:8080/api/expenses`

---

## 🌐 Frontend Setup

No build step needed! Just open `frontend/index.html` in your browser.

> **Note:** Make sure the backend is running first, otherwise the API calls will fail.

For a better experience, use the Live Server extension in VS Code.

---

## 🔌 API Endpoints

| Method | Endpoint                          | Description          |
|--------|-----------------------------------|----------------------|
| GET    | /api/expenses                     | Get all expenses     |
| GET    | /api/expenses/{id}                | Get expense by ID    |
| GET    | /api/expenses/category/{category} | Filter by category   |
| GET    | /api/expenses/total               | Get total amount     |
| POST   | /api/expenses                     | Create new expense   |
| PUT    | /api/expenses/{id}                | Update expense       |
| DELETE | /api/expenses/{id}                | Delete expense       |

### Example POST body:
```json
{
  "title": "Lunch",
  "amount": 250.00,
  "category": "Food",
  "date": "2024-01-15",
  "note": "Ate at Café Coffee Day"
}
```

---

## 🚀 Hosting Live (For Recruiters)

### Backend — Deploy on Render (Free)
1. Push your project to GitHub
2. Go to https://render.com → New Web Service
3. Connect your repo, set:
   - Build Command: `mvn clean package -DskipTests`
   - Start Command: `java -jar target/expense-tracker-0.0.1-SNAPSHOT.jar`
4. Add environment variables for DB credentials
5. Use Render's free PostgreSQL database

### Frontend — Deploy on GitHub Pages or Netlify
1. Update `API_URL` in `app.js` to your Render backend URL
2. Upload `frontend/` folder to Netlify or enable GitHub Pages

---

## ✨ Features
- Add, Edit, Delete expenses
- Filter by category (Food, Transport, Shopping, Health, Entertainment, Other)
- Dashboard stats: Total spent, expense count, top category
- Clean dark UI with animations
- Fully responsive

---

## 🛠 Tech Stack
| Layer     | Tech                     |
|-----------|--------------------------|
| Backend   | Java 17, Spring Boot 3.2 |
| Database  | PostgreSQL               |
| ORM       | Spring Data JPA          |
| Frontend  | HTML5, CSS3, Vanilla JS  |
| API Style | REST                     |
