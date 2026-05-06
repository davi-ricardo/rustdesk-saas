import axios from "axios";

// No frontend rodando em produção (VPS), precisamos que ele aponte para o IP da VPS
// Se estivermos em localhost, ele usa localhost.
const api = axios.create({
  baseURL: window.location.hostname === 'localhost' 
    ? "http://localhost:3000" 
    : `http://${window.location.hostname}:3000`
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
