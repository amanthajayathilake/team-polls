import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import "./App.css";
import type { Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

interface Poll {
  id: string;
  question: string;
  options: string[];
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface PollResults {
  poll: Poll;
  votes: number[];
  totalVotes: number;
}

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [pollId, setPollId] = useState<string>("");
  const [poll, setPoll] = useState<PollResults | null>(null);
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication
  useEffect(() => {
    const getToken = async () => {
      try {
        const response = await axios.post(`${API_URL}/auth/anon`);
        setToken(response.data.token);
        axios.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.token}`;
      } catch (err) {
        setError("Failed to authenticate");
      }
    };
    getToken();
  }, []);

  // Load poll
  const loadPoll = async () => {
    if (!pollId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/poll/${pollId}`);
      setPoll(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load poll");
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket connection
  useEffect(() => {
    if (!poll || !token) return;

    const ws = io(WS_URL, {
      transports: ["websocket"],
      query: { token },
    });

    ws.on("connect", () => {
      console.log("WebSocket connected");
      ws.emit(
        "message",
        JSON.stringify({
          type: "subscribe",
          pollId: poll.poll.id,
          token,
        })
      );
    });

    ws.on("message", (data: string) => {
      const message = JSON.parse(data);

      if (message.type === "vote_update") {
        setPoll((current) => ({
          ...current!,
          votes: message.data.votes,
          totalVotes: message.data.totalVotes,
        }));
      } else if (message.type === "poll_closed") {
        setPoll((current) => ({
          ...current!,
          poll: { ...current!.poll, isActive: false },
        }));
      }
    });

    setSocket(ws);

    return () => {
      ws.emit(
        "message",
        JSON.stringify({
          type: "unsubscribe",
          pollId: poll.poll.id,
        })
      );
      ws.close();
    };
  }, [poll?.poll.id, token]);

  // Vote
  const vote = async (optionIndex: number) => {
    if (!poll || !poll.poll.isActive) return;

    try {
      await axios.post(`${API_URL}/poll/${poll.poll.id}/vote`, { optionIndex });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cast vote");
    }
  };

  // Prepare chart data
  const chartData = poll
    ? poll.poll.options.map((option, index) => ({
        name: option,
        votes: poll.votes[index] || 0,
      }))
    : [];

  if (!token) {
    return <div>Initializing...</div>;
  }

  return (
    <div className="App">
      <h1>Team Polls</h1>

      {!poll && (
        <div className="poll-loader">
          <input
            type="text"
            placeholder="Enter Poll ID"
            value={pollId}
            onChange={(e) => setPollId(e.target.value)}
          />
          <button onClick={loadPoll} disabled={loading}>
            {loading ? "Loading..." : "Load Poll"}
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {poll && (
        <div className="poll-container">
          <h2>{poll.poll.question}</h2>

          <div className="status">
            Status: {poll.poll.isActive ? "Active" : "Closed"}
          </div>

          {poll.poll.isActive && (
            <div className="options">
              {poll.poll.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => vote(index)}
                  className="option-button"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="results">
            <h3>Live Results (Total: {poll.totalVotes})</h3>
            <BarChart width={600} height={300} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="votes" fill="#8884d8" />
            </BarChart>
          </div>

          <div className="poll-info">
            <p>Expires: {new Date(poll.poll.expiresAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
