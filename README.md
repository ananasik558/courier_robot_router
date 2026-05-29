# 🚚 Courier Robot Router

> **ВКР** | Разработка приложения для построения маршрутов пеших и вело-курьеров в условиях малого бизнеса

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat&logo=postgresql&logoColor=white)

---

## 📋 Оглавление

- [О проекте](#-о-проекте)
- [Архитектура](#-архитектура)
- [Технологический стек](#-технологический-стек)
- [Функциональные возможности](#-функциональные-возможности)
- [Быстрый старт](#-быстрый-старт)
- [API Endpoints](#-api-endpoints)
- [Структура проекта](#-структура-проекта)
- [Тестирование](#-тестирование)
- [Вклад в проект](#-вклад-в-проект)
- [Лицензия](#-лицензия)

---

## 🎯 О проекте

Полнофункциональное веб-приложение для автоматизации логистики малого бизнеса, специализирующегося на доставке. Система оптимизирует маршруты курьеров (пеших и велосипедных) с учётом:

- 🗺️ Реальной дорожной сети через **OSRM**
- 🧬 Генетических алгоритмов оптимизации (**DEAP**)
- 📍 Геоданных и пространственных запросов (**PostGIS**)
- 🎨 Интуитивного интерфейса с интерактивной картой

Проект разработан в рамках выпускной квалификационной работы и направлен на повышение эффективности доставки в условиях ограниченных ресурсов малого бизнеса.

---

### 🔗 Взаимодействие сервисов

| Сервис | Порт | Назначение |
|--------|------|------------|
| **Frontend** | `3000` | Веб-интерфейс пользователя |
| **Backend** | `8000` | REST API, бизнес-логика, оптимизация |
| **PostgreSQL + PostGIS** | `5432` | Хранение данных, геозапросы |
| **OSRM** | `5000` | Построение маршрутов по карте |

---

## 💻 Технологический стек

### 🔙 Backend
```yaml
Framework:      FastAPI 0.104.1
ORM:            SQLAlchemy 2.0.23
Validation:     Pydantic 2.5.0
Algorithms:     DEAP 1.4.1 (генетические алгоритмы), NumPy 1.26.0
Database:       PostgreSQL 15 + PostGIS 3.3
Routing:        OSRM Backend (MLD algorithm)
Testing:        pytest 7.4.3
Server:         Uvicorn 0.24.0
```

### 🔜 Frontend
```yaml
Framework:      React 18.2 + TypeScript 5.2
Build Tool:     Vite 5.0
UI Library:     Ant Design 5.11.0
Maps:           Leaflet 1.9.4 + react-leaflet
HTTP Client:    Axios 1.6.0
Routing:        React Router DOM 6.20.0
Utils:          Day.js 1.11.10
```

### 🐳 Инфраструктура
```yaml
Containerization: Docker + Docker Compose
OSRM Image:       ghcr.io/project-osrm/osrm-backend:latest
PostGIS Image:    postgis/postgis:15-3.3
Network:          Docker bridge network
```

---

## ✨ Функциональные возможности

### 🗂️ Управление заказами
- ➕ Создание новых заказов с адресами доставки
- 📋 Просмотр и фильтрация активных маршрутов
- ✏️ Редактирование параметров доставки (время, приоритет, тип курьера)

### 🧭 Оптимизация маршрутов
- 🔄 Автоматическое построение оптимального порядка точек доставки
- 🚶 Поддержка пешего и велосипедного профиля перемещения
- ⚡ Учёт временных окон и ограничений по времени
- 🧬 Использование генетического алгоритма для NP-трудных задач

### 🗺️ Визуализация
- 🌍 Интерактивная карта с отображением маршрутов
- 📍 Маркеры точек забора и доставки
- 🎨 Цветовое кодирование статусов заказов
- 📏 Отображение расстояний и расчётного времени

### 👥 Управление курьерами
- 📝 Регистрация и профили курьеров
- 📊 Назначение заказов с учётом загрузки
- 📱 Адаптивный интерфейс для мобильных устройств

---

## 🚀 Быстрый старт

### 📦 Предварительные требования

- Docker и Docker Compose (v2.0+)
- Git
- Минимум 4 ГБ оперативной памяти (для OSRM)

### ⚙️ Установка и запуск

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/ananasik558/courier_robot_router.git
cd courier_robot_router
```

2. **Подготовьте данные OSRM**  
   Поместите файл карты в формате `.osm.pbf` в директорию `./osrm/data/` и выполните предварительную обработку:
```bash
# Пример для Москвы (замените на нужный регион)
docker run -t -v "${PWD}/osrm/data:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/moscow.osm.pbf
docker run -t -v "${PWD}/osrm/data:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/moscow.osrm
docker run -t -v "${PWD}/osrm/data:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/moscow.osrm
```

3. **Запустите все сервисы**
```bash
docker-compose up --build -d
```

4. **Проверьте статус сервисов**
```bash
docker-compose ps
# Ожидайте: все контейнеры в статусе "healthy" или "up"
```

5. **Откройте приложение**
- 🌐 Фронтенд: [http://localhost:3000](http://localhost:3000)
- 📚 API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- 🔄 ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 🛑 Остановка
```bash
docker-compose down
# С удалением томов (если нужно сбросить БД):
docker-compose down -v
```


## 📁 Структура проекта

```
courier_robot_router/
├── backend/
│   ├── app/
│   │   ├── main.py              # Точка входа FastAPI
│   │   ├── api/                 # API роуты
│   │   ├── core/                # Конфигурация, безопасность
│   │   ├── models/              # SQLAlchemy модели
│   │   ├── schemas/             # Pydantic схемы
│   │   ├── services/            # Бизнес-логика
│   │   │   ├── routing/         # Логика оптимизации маршрутов
│   │   │   └── genetic/         # Генетический алгоритм (DEAP)
│   │   └── db/                  # Работа с БД
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React-компоненты
│   │   ├── pages/               # Страницы приложения
│   │   ├── services/            # API-клиенты (axios)
│   │   ├── types/               # TypeScript интерфейсы
│   │   └── utils/               # Вспомогательные функции
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── osrm/
│   └── data/                    # Файлы карт OSRM (*.osrm)
│
├── docker-compose.yml           # Оркестрация сервисов
├── .gitignore
└── README.md
```

---

## 🧪 Тестирование

### Запуск тестов бэкенда
```bash
# Внутри контейнера бэкенда:
docker-compose exec backend pytest
# Или локально:
cd backend && python -m pytest tests/ -v
```

### Проверка типов во фронтенде
```bash
cd frontend
npm run build  # Включает type-checking
```

### Интеграционное тестирование
```bash
# Запуск полного стека и прогон e2e-тестов (при наличии)
docker-compose up -d
# ... выполнить тестовые сценарии ...
docker-compose down
```
