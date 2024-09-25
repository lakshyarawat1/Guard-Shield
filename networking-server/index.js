import express from "express";
import { createServer } from "http";
import cors from "cors";
import { execute_tshark } from "./services/packet_capturer.js";
import { Server } from "socket.io";


const app = express();
export const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello world");
});



io.on("connection", (socket) => {
  console.log("Socket Connected.");
  execute_tshark(socket)

  socket.on('disconnect', () => {
    console.log('Socket Disconnected')
  })
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
