FROM nginx:1.27-alpine
COPY index.html styles.css geometry.js script.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ | grep -q BoxForge
