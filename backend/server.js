require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const initSocketServer = require("./src/sockets/socket.server");
const http = require("http");

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
connectDB()
initSocketServer(httpServer)
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});