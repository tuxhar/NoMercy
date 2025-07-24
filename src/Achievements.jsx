import React from "react";

export default function Achievements() {
  const achievements = [
    { title: "First Step", desc: "Completed your first task" },
    { title: "Early Bird", desc: "Completed a Wake Up task on time" },
    { title: "Streak Master", desc: "7 days without missing" },
    { title: "Death Survived", desc: "Completed all tasks on Death Mode day" }
  ];

  return (
    <div className="pt-20 p-4 text-white">
      <h2 className="text-2xl mb-4">Achievements</h2>
      <ul className="space-y-2">
        {achievements.map((a, idx) => (
          <li key={idx} className="bg-white/20 p-3 rounded">
            <strong>{a.title}</strong>
            <p className="text-sm">{a.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
