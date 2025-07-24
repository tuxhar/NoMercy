import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebaseConfig"; // ✅ Correct filename
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

const forgiveByLevel = {
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
  const remainingForgives = forgiveByLevel[level] ?? 0;

  // 🔄 Restore user state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setTasks(data.tasks || {});
          setXp(data.xp || 0);
        } else {
          await setDoc(docRef, { tasks: {}, xp: 0 });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🧠 Save data
  const saveData = async (updatedTasks, updatedXp) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      tasks: updatedTasks,
      xp: updatedXp,
    });
  };

  const addTask = () => {
    if (!input.trim()) return;
    const newTasks = { ...tasks, [input]: { completed: false, forgives: 0 } };
    setTasks(newTasks);
    setInput("");
    saveData(newTasks, xp);
  };

  const completeTask = (task) => {
    const newTasks = { ...tasks };
    if (!newTasks[task].completed) {
      newTasks[task].completed = true;
      const newXp = xp + 10;
      setTasks(newTasks);
      setXp(newXp);
      saveData(newTasks, newXp);
    }
  };

  const forgiveTask = (task) => {
    const newTasks = { ...tasks };
    const totalForgivesUsed = Object.values(newTasks).reduce(
      (acc, t) => acc + (t.forgives || 0),
      0
    );
    if (totalForgivesUsed < remainingForgives) {
      newTasks[task].completed = true;
      newTasks[task].forgives = (newTasks[task].forgives || 0) + 1;
      setTasks(newTasks);
      saveData(newTasks, xp);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null); // 👈 Brings login screen
  };

  if (!user) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold mb-4">No Mercy</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => signInWithPopup(auth, provider)}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Welcome, {user.displayName}</h2>
        <button onClick={handleLogout} className="text-red-500 underline">
          Logout
        </button>
      </div>

      <div className="mb-4">
        <p>Level: {level}</p>
        <p>XP: {xp}</p>
        <p>Forgives Left: {remainingForgives - Object.values(tasks).reduce((acc, t) => acc + (t.forgives || 0), 0)}</p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="border px-2 py-1 w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New Task"
        />
        <button onClick={addTask} className="bg-green-600 text-white px-3 rounded">
          Add
        </button>
      </div>

      <div className="space-y-2">
        {Object.keys(tasks).map((task) => (
          <div
            key={task}
            className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded"
          >
            <span
              className={`${
                tasks[task].completed ? "line-through text-gray-500" : ""
              }`}
            >
              {task}
            </span>
            <div className="space-x-2">
              {!tasks[task].completed && (
                <>
                  <button
                    onClick={() => completeTask(task)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => forgiveTask(task)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                  >
                    Forgive
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
