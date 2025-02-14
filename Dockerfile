# Указываем базовый образ для Node.js версии 20.18.0
FROM node:22.13.0

# Устанавливаем рабочую директорию в контейнере
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json (если есть) в контейнер
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь проект в контейнер
COPY . .

# Запускаем приложение
CMD ["npm", "start"]