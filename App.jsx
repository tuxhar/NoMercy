import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB3GgAgQvcuWElNsrZ0FaZSSYoPY0tnSTw",
  authDomain: "no-mercy-28e0a.firebaseapp.com",
  projectId: "no-mercy-28e0a",
  storageBucket: "no-mercy-28e0a.appspot.com",
  messagingSenderId: "353208485106",
  appId: "1:353208485106:web:bc33f4d201cbfd95f8fc6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState({});
  const [wakeTime, setWakeTime] = useState("06:00");
  const [strictMode, setStrictMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Load user
  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const d = snap.data();
          setXP(d.xp || 0);
          setLevel(d.level || 1);
          setTasks(d.tasks || {});
          setWakeTime(d.wakeTime || "06:00");
          setStrictMode(d.strictMode || false);
        }
      }
    });
  }, []);

  // Save data
  useEffect(() => {
    if (user) {
      setDoc(doc(db, "users", user.uid), {
        xp,
        level,
        tasks,
        wakeTime,
        strictMode,
      });
    }
  }, [xp, level, tasks, wakeTime, strictMode]);

  const levelCap = 100;
  const progressPercent = ((xp % levelCap) / levelCap) * 100;

  const handleAddTask = () => {
    if (!input.trim()) return;
    const id = Date.now();
    const newTask = {
      id,
      title: input,
      time: new Date().toLocaleTimeString([], { hour12: false }),
      duration: "30",
      done: false
    };
    setTasks(prev => {
      const list = [...(prev[selectedDate] || []), newTask];
      return { ...prev, [selectedDate]: list };
    });
    setInput("");
  };

  const toggleTask = (id) => {
    const updated = tasks[selectedDate].map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks({ ...tasks, [selectedDate]: updated });
    const task = tasks[selectedDate].find(t => t.id === id);
    if (!task?.done) setXP(prev => prev + 10);
  };

  const checkWakeTime = () => {
    const now = new Date();
    const [h, m] = wakeTime.split(":").map(Number);
    const graceTime = new Date();
    graceTime.setHours(h, m + 10, 0);
    if (strictMode && now > graceTime) {
      setXP(0);
      setLevel(1);
    }
  };

  useEffect(() => {
    const interval = setInterval(checkWakeTime, 60000);
    return () => clearInterval(interval);
  }, [wakeTime, strictMode]);

  return (
    <div className={dark ? "bg-black text-white min-h-screen p-4" : "bg-white text-black min-h-screen p-4"}>
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">No Mercy</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
          {user ? (
            <button onClick={() => signOut(auth)}>Logout</button>
          ) : (
            <button onClick={async () => {
              const provider = new GoogleAuthProvider();
              const res = await signInWithPopup(auth, provider);
              setUser(res.user);
            }}>
              Login
            </button>
          )}
        </div>
      </div>

      {user && (
        <>
          <div className="mb-2">
            <label>Wake-Up Time:</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="ml-2"
            />
            <label className="ml-4">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
              />
              Strict Mode
            </label>
          </div>

          <div className="mb-2">
            <label>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="ml-2"
            />
          </div>

          <div className="mb-2">
            <input
              type="text"
              value={input}
              placeholder="Task..."
              onChange={(e) => setInput(e.target.value)}
              className="border p-1"
            />
            <button onClick={handleAddTask} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded">Add</button>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-semibold">Today's Tasks</h2>
            {(tasks[selectedDate] || []).map(task => (
              <div key={task.id} className="flex justify-between p-2 border-b">
                <span>{task.title}</span>
                <div>
                  <span className="text-xs">{task.time} ({task.duration}m)</span>
                  <input
                    type="checkbox"
                    className="ml-2"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <p>XP: {xp} | Level: {level}</p>
            <div className="h-4 bg-gray-300 rounded">
              <div
                className="h-4 bg-green-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
            <h2 className="text-xl mb-2">📈 Report</h2>
            <p>Total XP: {xp}</p>
            <p>Level: {level}</p>
            <p>Strict Mode: {strictMode ? "ON" : "OFF"}</p>
            <p>Wake Time: {wakeTime}</p>
            <p>Tasks Today: {(tasks[selectedDate] || []).length}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
