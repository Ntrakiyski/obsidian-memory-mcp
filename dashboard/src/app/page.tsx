'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:6666/count')
      .then(res => res.json())
      .then(data => setCount(data.count))
      .catch(() => setCount(0));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Obsidian Memory Dashboard</h1>
      <p>Total Notes: {count ?? '...'}</p>
    </div>
  );
}
