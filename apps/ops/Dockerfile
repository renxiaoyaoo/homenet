FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM python:3.12-alpine
RUN apk add --no-cache openssh-client
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./app.py
COPY --from=frontend /static ./static
ENV PORT=9999
EXPOSE 9999
CMD ["python", "/app/app.py"]
