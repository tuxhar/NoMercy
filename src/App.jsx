import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from './firebaseConfig';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

export default function App() {
  // Main State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [forgiveCount, setForgiveCount] = useState(3);
  const [deathModeDay, setDeathModeDay] = useState(null);
  const [reports, setReports] = useState({
    daily: 0,
    weekly: 0,
    streak: 0
  });

  // Constants
  const XP_PER_LEVEL = 500;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadUserData(user);
      } else {
        resetState();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadUserData = async (user) => {
    setUser(user);
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      setXp(data.xp || 0);
      setLevel(data.level || 1);
      setForgiveCount(data.forgiveCount || 3);
      setDeathModeDay(data.deathModeDay || null);
      await loadTasks(user.uid);
      generateReports(user.uid);
    } else {
      await initNewUser(userRef, user);
    }
  };

  const initNewUser = async (userRef, user) => {
    await setDoc(userRef, {
      name: user.displayName,
      email: user.email,
      xp: 0,
      level: 1,
      forgiveCount: 3,
      deathModeDay: null,
      streak: 0,
      lastActive: Timestamp.now()
    });
  };

  const loadTasks = async (userId) => {
    const q = query(collection(db, "tasks"), 
      where("userId", "==", userId),
      where("date", "==", new Date().toISOString().split('T')[0])
    );
    const querySnapshot = await getDocs(q);
    setTasks(querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
  };

  const generateReports = async (userId) => {
    // Daily report
    const today = new Date();
    const dailyQuery = query(collection(db, "tasks"), 
      where("userId", "==", userId),
      where("date", "==", today.toISOString().split('T')[0]),
      where("completed", "==", true)
    );
    const dailySnapshot = await getDocs(dailyQuery);
    
    // Weekly report
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weeklyQuery = query(collection(db, "tasks"), 
      where("userId", "==", userId),
      where("date", ">=", weekStart.toISOString().split('T')[0]),
      where("completed", "==", true)
    );
    const weeklySnapshot = await getDocs(weeklyQuery);
    
    setReports({
      daily: dailySnapshot.size,
      weekly: weeklySnapshot.size,
      streak: 0 // Implement your streak logic
    });
  };

  // Task System
  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    
    const taskData = {
      userId: user.uid,
      text: newTask,
      date: new Date().toISOString().split('T')[0],
      completed: false,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, "tasks"), taskData);
    setTasks([...tasks, {id: docRef.id, ...taskData}]);
    setNewTask('');
  };

  const completeTask = async (taskId) => {
    if (!user) return;
    
    // Update in Firestore
    await updateDoc(doc(db, "tasks", taskId), { completed: true });
    
    // Update local state
    setTasks(tasks.map(task => 
      task.id === taskId ? {...task, completed: true} : task
    ));
    
    // Add XP
    const newXp = xp + 10;
    setXp(newXp);
    await updateDoc(doc(db, "users", user.uid), { xp: newXp });
    
    // Check level up
    if (newXp >= XP_PER_LEVEL * level) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setXp(0);
      await updateDoc(doc(db, "users", user.uid), { 
        level: newLevel,
        xp: 0
      });
    }
    
    // Update reports
    generateReports(user.uid);
  };

  const forgiveTask = async (taskId) => {
    if (forgiveCount <= 0 || !user) return;
    
    // Update in Firestore
    await updateDoc(doc(db, "tasks", taskId), { completed: true });
    
    // Update local state
    setTasks(tasks.map(task => 
      task.id === taskId ? {...task, completed: true} : task
    ));
    
    // Deduct forgive count
    const newCount = forgiveCount - 1;
    setForgiveCount(newCount);
    await updateDoc(doc(db, "users", user.uid), { 
      forgiveCount: newCount 
    });
    
    // Update reports
    generateReports(user.uid);
  };

  // Death Mode System
  const toggleDeathMode = async (day) => {
    if (!user) return;
    
    const newDay = deathModeDay === day ? null : day;
    setDeathModeDay(newDay);
    await updateDoc(doc(db, "users", user.uid), { 
      deathModeDay: newDay 
    });
  };

  const resetState = () => {
    setUser(null);
    setTasks([]);
    setXp(0);
    setLevel(1);
    setForgiveCount(3);
    setDeathModeDay(null);
    setReports({
      daily: 0,
      weekly: 0,
      streak: 0
    });
  };

  // UI Rendering
  if (loading) {
    return <div className="text-white text-center mt-10">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <button 
          onClick={() => signInWithPopup(auth, googleProvider)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">No Mercy Habit Tracker</h1>
        <button 
          onClick={() => signOut(auth)}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </header>

      {/* User Stats */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl mb-2">Welcome, {user.displayName}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold">Level</h3>
            <p>{level}</p>
          </div>
          <div>
            <h3 className="font-semibold">XP</h3>
            <p>{xp}/{XP_PER_LEVEL * level}</p>
          </div>
          <div>
            <h3 className="font-semibold">Forgives</h3>
            <p>{forgiveCount}</p>
          </div>
        </div>
      </div>

      {/* Death Mode */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl mb-3">Death Mode</h2>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => toggleDeathMode(day)}
              className={`px-3 py-1 rounded ${
                deathModeDay === day 
                  ? 'bg-red-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        {deathModeDay && (
          <p className="mt-2 text-red-400">
            Death Mode active on {deathModeDay} - No forgives allowed!
          </p>
        )}
      </div>

      {/* Add Task */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Enter new task"
          className="flex-1 p-2 rounded text-black"
        />
        <button 
          onClick={addTask}
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
        >
          Add Task
        </button>
      </div>

      {/* Task List */}
      <div className="mb-6">
        <h2 className="text-xl mb-3">Today's Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-400">No tasks for today</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map(task => (
              <li 
                key={task.id} 
                className="bg-gray-800 p-3 rounded flex justify-between items-center"
              >
                <span className={task.completed ? 'line-through text-gray-400' : ''}>
                  {task.text}
                </span>
                {!task.completed ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => completeTask(task.id)}
                      className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
                    >
                      Complete
                    </button>
                    {deathModeDay !== DAYS[new Date().getDay()] && (
                      <button
                        onClick={() => forgiveTask(task.id)}
                        disabled={forgiveCount <= 0}
                        className={`px-3 py-1 rounded ${
                          forgiveCount <= 0 
                            ? 'bg-gray-500 cursor-not-allowed' 
                            : 'bg-yellow-500 hover:bg-yellow-600'
                        }`}
                      >
                        Forgive
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-green-400">✓ Completed</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reports */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl mb-3">Reports</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold">Daily</h3>
            <p>{reports.daily} tasks</p>
          </div>
          <div>
            <h3 className="font-semibold">Weekly</h3>
            <p>{reports.weekly} tasks</p>
          </div>
          <div>
            <h3 className="font-semibold">Streak</h3>
            <p>{reports.streak} days</p>
          </div>
        </div>
      </div>
    </div>
  );
    }
