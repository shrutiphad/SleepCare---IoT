// import { io } from "socket.io-client";

// const socket = io("http://localhost:3001", {
//   transports: ["websocket"],
//   autoConnect: true,
// });

// export default socket;

import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;