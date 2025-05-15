import axios from "axios";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import io from "socket.io-client";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
// TODO: CHECKTHIS WITH DOCKER CONFIG ENV
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";
// const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:5173";

console.log(WS_URL);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EXP: Create poll form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState(60); // minutes
  const [creating, setCreating] = useState(false);

  // EXP: Initialize authentication
  useEffect(() => {
    const getToken = async () => {
      try {
        const response = await axios.post(`${API_URL}/auth/anon`);
        console.log("annonymousToken", response);
        setToken(response.data.token);
        axios.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.token}`;
      } catch (err) {
        setError("Failed to authenticate");
      }
    };
    getToken();
  }, []);

  // EXP: Load poll
  const loadPoll = async () => {
    if (!pollId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/poll/${pollId}`);
      setPoll(response.data);
      setShowCreateForm(false);
      toast.success("Poll loaded successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load poll");
      toast.error("Too may requests, please wait a few seconds");
    } finally {
      setLoading(false);
    }
  };

  // EXP: Create poll
  const createPoll = async () => {
    if (
      !newPollQuestion ||
      newPollOptions.filter((opt) => opt.trim()).length < 2
    ) {
      setError("Please provide a question and at least 2 options");
      toast.error("Please provide a question and at least 2 options");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + pollDuration);

      const response = await axios.post(`${API_URL}/poll`, {
        question: newPollQuestion,
        options: newPollOptions.filter((opt) => opt.trim()),
        expiresAt: expiresAt.toISOString(),
      });

      // Load the created poll
      setPollId(response.data.id);
      await loadPoll();

      // Reset form
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
      setPollDuration(60);
      setShowCreateForm(false);
      toast.success("Poll created successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create poll");
      toast.error(err.response?.data?.error || "Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  // EXP: Setup WebSocket connection
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

  // EXP: Vote
  const vote = async (optionIndex: number) => {
    if (!poll || !poll.poll.isActive) return;

    try {
      await axios.post(`${API_URL}/poll/${poll.poll.id}/vote`, { optionIndex });
      toast.success("Vote cast successfully");
    } catch (err: any) {
      if (err.response?.status === 429) {
        toast.error("Too may requests, please wait a few seconds");
      }

      setError(err.response?.data?.error || "Failed to cast vote");
      toast.error(err.response?.data?.error || "Failed to cast vote");
    }
  };

  // EXP: Handle adding/removing options for new poll
  const addOption = () => {
    if (newPollOptions.length < 10) {
      setNewPollOptions([...newPollOptions, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (newPollOptions.length > 2) {
      setNewPollOptions(newPollOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newPollOptions];
    updated[index] = value;
    setNewPollOptions(updated);
  };

  // EXP: Prepare chart data
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
      <ToastContainer />

      <h1>Team Polls</h1>

      {!poll && !showCreateForm && (
        <div className="poll-actions">
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
          <div className="divider">OR</div>
          <button
            className="create-poll-btn"
            onClick={() => setShowCreateForm(true)}
          >
            Create New Poll
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-poll-form">
          <h2>Create New Poll</h2>
          <div className="form-group">
            <label>Question:</label>
            <input
              type="text"
              placeholder="What's your question?"
              value={newPollQuestion}
              onChange={(e) => setNewPollQuestion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Options:</label>
            {newPollOptions.map((option, index) => (
              <div key={index} className="option-input">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
                {newPollOptions.length > 2 && (
                  <button
                    className="remove-option"
                    onClick={() => removeOption(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {newPollOptions.length < 10 && (
              <button className="add-option" onClick={addOption}>
                + Add Option
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Poll Duration:</label>
            <select
              value={pollDuration}
              onChange={(e) => setPollDuration(Number(e.target.value))}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              className="create-btn"
              onClick={createPoll}
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Poll"}
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                setShowCreateForm(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {poll && (
        <div className="poll-container">
          <h2>{poll.poll.question}</h2>

          <div className="poll-id-display">
            Poll ID: <span className="poll-id">{poll.poll.id}</span>
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(poll.poll.id);
                alert("Poll ID copied to clipboard!");
              }}
            >
              Copy
            </button>
          </div>

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

          <button
            className="back-btn"
            onClick={() => {
              setPoll(null);
              setPollId("");
              setShowCreateForm(false);
            }}
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
