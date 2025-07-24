import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Login from "./Login";
import Dashboard from "./Dashboard";

const App = () => {
  const [user, setUser] = useState(null);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [tasks, setTasks] = useState({});
  const [wakeTime, setWakeTime] = useState("06:00");
  const [strictMode, setStrictMode] = useState(false);
  const [forgivesLeft, setForgivesLeft] = useState(6);
  const [loading, setLoading] = useState(true);

  // 🔁 Firebase data restore on login or reload
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
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
          setForgivesLeft(d.forgivesLeft ?? Math.max(0, 7 - (d.level || 1)));
        } else {
          // 👶 First-time user? Create initial data
          await setDoc(doc(db, "users", u.uid), {
            xp: 0,
            level: 1,
            tasks: {},
            wakeTime: "06:00",
            strictMode: false,
            forgivesLeft: 6,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 💾 Auto-save to Firebase when any state changes
  useEffect(() => {
    if (user && !loading) {
      setDoc(doc(db, "users", user.uid), {
        xp,
        level,
        tasks,
        wakeTime,
        strictMode,
        forgivesLeft,
      });
    }
  }, [xp, level, tasks, wakeTime, strictMode, forgivesLeft, user, loading]);

  // 🔓 Logout
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setXP(0);
    setLevel(1);
    setTasks({});
    setWakeTime("06:00");
    setStrictMode(false);
    setForgivesLeft(6);
  };

  // ⏳ While Firebase is checking
  if (loading) return <div className="p-4 text-center">Loading...</div>;

  // 🔐 Show login page if not signed in
  if (!user) return <Login />;

  // 🧠 Main Dashboard
  return (
    <Dashboard
      xp={xp}
      setXP={setXP}
      level={level}
      setLevel={setLevel}
      tasks={tasks}
      setTasks={setTasks}
      wakeTime={wakeTime}
      setWakeTime={setWakeTime}
      strictMode={strictMode}
      setStrictMode={setStrictMode}
      forgivesLeft={forgivesLeft}
      setForgivesLeft={setForgivesLeft}
      onLogout={handleLogout}
    />
  );
};

export default App;
