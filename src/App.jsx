import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebaseConfig"; // Your file name
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const defaultForgiveByLevel = {
  1: 6,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
};

const App = () => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState({});
  const [input, setInput] = useState("");
  const [xp, setXp] = useState(0);
  const [strictMode, setStrictMode] = useState(false);

  const level = Math.floor(xp / 100) + 1;
  const availableForgive = defaultForgiveByLevel[level] || 0;

  // ✅ Save data to Firestore
  const saveData = async (updatedTasks, updatedXP) => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, {
      tasks: updatedTasks,
      xp: updatedXP,
    });
  };

  // ✅ Load data from Firestore on login
  useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setTasks(data.tasks || {});
          setXp(data.xp || 0);
        } else {
          await setDoc(docRef, { tasks: {}, xp: 0 });
          setTasks({});
          setXp(0);
        }
      } else {
        setUser(null);
        setTasks({});
        setXp(0);
      }
    });
  }, []);

  const handleAddTask = () => {
    if (!input.trim()) return;
    const id = Date.now();
    const newTasks = {
      ...tasks,
      [id]: { text: input, completed: false, forgiven: false },
    };
    const newXP = xp;
    setTasks(newTasks);
    setInput("");
    saveData(newTasks, newXP);
  };

  const handleComplete = (id) => {
    const newTasks = { ...tasks };
    if (!newTasks[id].completed) {
      newTasks[id].completed = true;
      const gainedXP = strictMode ? 0 : 10;
      const newXP = xp + gainedXP;
      setTasks(newTasks);
      setXp(newXP);
      saveData(newTasks, newXP);
    }
  };

  const handleForgive = (id) => {
    if (availableForgive <= 0) return;
    const newTasks = { ...tasks };
    if (!newTasks[id].completed && !newTasks[id].forgiven) {
      newTasks[id].forgiven = true;
      setTasks(newTasks);
      saveData(newTasks, xp);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const loginWithGoogle = () => {
    signInWithPopup(auth, provider);
  };

  return (
    <div style={{ padding: "20px" }}>
      {!user ? (
        <div>
          <h2>Login</h2>
          <button onClick={loginWithGoogle}>Login with Google</button>
        </div>
      ) : (
        <div>
          <h2>Welcome, {user.displayName}</h2>
          <p>XP: {xp} | Level: {level} | Forgive left: {availableForgive}</p>

          <button onClick={handleLogout}>Logout</button>
          <label style={{ marginLeft: "10px" }}>
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
            />
            DeathMode (Strict)
          </label>

          <div style={{ marginTop: "20px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter task"
            />
            <button onClick={handleAddTask}>Add Task</button>
          </div>

          <ul>
            {Object.entries(tasks).map(([id, task]) => (
              <li key={id}>
                <span
                  style={{
                    textDecoration: task.completed
                      ? "line-through"
                      : task.forgiven
                      ? "underline"
                      : "none",
                  }}
                >
                  {task.text}
                </span>
                {!task.completed && (
                  <>
                    <button onClick={() => handleComplete(id)}>✓</button>
                    {!task.forgiven && availableForgive > 0 && (
                      <button onClick={() => handleForgive(id)}>Forgive</button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
