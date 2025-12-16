# Этап 1: Сборка приложения
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем файлы с зависимостями и устанавливаем их
COPY package.json package-lock.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Собираем TypeScript в JavaScript
RUN npm run build

# Этап 2: Создание production-образа
FROM node:20-alpine
WORKDIR /app

# Копируем package.json и устанавливаем только production-зависимости
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Копируем собранное приложение из предыдущего этапа
COPY --from=builder /app/dist ./dist

# Открываем порт, на котором работает приложение
EXPOSE 4000

# Команда для запуска приложения
CMD ["node", "dist/server.js"]
