import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setUsers(list);
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="pt-20 p-4 text-white">
      <h2 className="text-2xl mb-4">Leaderboard</h2>
      <ol className="space-y-2">
        {users.map((u, idx) => (
          <li key={idx} className="bg-white/20 p-2 rounded">
            #{idx + 1} {u.name} - {u.xp} XP
          </li>
        ))}
      </ol>
    </div>
  );
}
