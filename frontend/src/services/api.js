import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000"
});

export const fetchLogs = () => API.get("/logs");
export const createLog = (data) => API.post("/logs", data);
